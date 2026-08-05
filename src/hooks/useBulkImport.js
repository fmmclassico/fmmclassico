import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  IMPORT_MODES,
  DEFAULT_BATCH_SIZE,
  loadImportHistory,
  prepareImportFile,
  runImport,
  rollbackImport,
  downloadErrorReport,
  loadImportJob,
} from '@/services/productImport/productImportService.js';

export function useBulkImport() {
  const queryClient = useQueryClient();
  const [job, setJob] = useState(null);
  const [history, setHistory] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0, currentRow: null, currentProduct: '', currentBatch: 0 });
  const [options, setOptions] = useState({ mode: IMPORT_MODES[0].value, batchSize: DEFAULT_BATCH_SIZE });

  const refreshHistory = useCallback(async () => {
    const nextHistory = await loadImportHistory();
    setHistory(nextHistory);
    return nextHistory;
  }, []);

  useEffect(() => {
    refreshHistory().catch(() => {});
  }, [refreshHistory]);

  const validateFile = useCallback(async (file) => {
    setIsBusy(true);
    try {
      const preparedJob = await prepareImportFile(file, options);
      setJob(preparedJob);
      setProgress({ processed: 0, total: preparedJob.totalRows, currentRow: null, currentProduct: '', currentBatch: 0 });
      await refreshHistory();
      toast.success(`Validated ${preparedJob.totalRows} row(s). Review the preview and start the import when ready.`);
      return preparedJob;
    } catch (error) {
      toast.error(error.message || 'Could not validate the spreadsheet.');
      throw error;
    } finally {
      setIsBusy(false);
    }
  }, [options, refreshHistory]);

  const startImport = useCallback(async (importId = job?.importId) => {
    if (!importId) return null;
    setIsBusy(true);
    try {
      const result = await runImport(importId, {
        onProgress: (nextProgress) => {
          setProgress(nextProgress);
        },
      });
      setJob(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['products-admin'] }),
      ]);
      await refreshHistory();
      toast.success('Bulk import completed. The product grid has been refreshed.');
      return result;
    } catch (error) {
      toast.error(error.message || 'Bulk import failed.');
      throw error;
    } finally {
      setIsBusy(false);
    }
  }, [job?.importId, queryClient, refreshHistory]);

  const resumeImport = useCallback(async (importId) => {
    setIsBusy(true);
    try {
      const resumableJob = await loadImportJob(importId);
      if (!resumableJob) throw new Error('Import job not found.');
      setJob(resumableJob);
      setProgress({
        processed: resumableJob.results?.processed || 0,
        total: resumableJob.totalRows || 0,
        currentRow: null,
        currentProduct: '',
        currentBatch: Math.floor((resumableJob.results?.processed || 0) / Math.max(1, resumableJob.batchSize || 1)) + 1,
      });
      return await startImport(importId);
    } finally {
      setIsBusy(false);
    }
  }, [startImport]);

  const rollback = useCallback(async (importId) => {
    setIsBusy(true);
    try {
      await rollbackImport(importId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['products-admin'] }),
      ]);
      await refreshHistory();
      toast.success('Rollback completed for the selected import.');
    } catch (error) {
      toast.error(error.message || 'Rollback failed.');
      throw error;
    } finally {
      setIsBusy(false);
    }
  }, [queryClient, refreshHistory]);

  const downloadErrors = useCallback(async (importId = job?.importId) => {
    try {
      await downloadErrorReport(importId);
    } catch (error) {
      toast.error(error.message || 'Could not generate the error report.');
    }
  }, [job?.importId]);

  const summary = useMemo(() => {
    if (!job) return null;
    const failedRows = job.rows?.filter((row) => row.errors?.length > 0).length || 0;
    const skippedRows = job.rows?.filter((row) => row.decision === 'skip_existing').length || 0;
    const previewRows = Array.isArray(job.rows) ? job.rows.slice(0, 20) : [];
    return {
      previewRows,
      failedRows,
      skippedRows,
      totalRows: job.totalRows || 0,
      canImportRows: (job.totalRows || 0) - failedRows,
    };
  }, [job]);

  return {
    job,
    history,
    isBusy,
    progress,
    options,
    summary,
    setOptions,
    setJob,
    refreshHistory,
    validateFile,
    startImport,
    resumeImport,
    rollback,
    downloadErrors,
  };
}
