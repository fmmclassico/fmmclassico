import React, { useRef } from 'react';
import { AlertCircle, FileSpreadsheet, History, Loader2, Play, RotateCcw, Upload, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBulkImport } from '@/hooks/useBulkImport.js';
import { DEFAULT_BATCH_SIZE, IMPORT_MODES, SUPPORTED_IMPORT_ACCEPT } from '@/services/productImport/productImportService.js';

function ResultBadge({ row }) {
  if (row.errors?.length) return <Badge variant="destructive">Error</Badge>;
  if (row.decision === 'skip_existing') return <Badge variant="secondary">Skip Existing</Badge>;
  if (row.decision === 'update_existing') return <Badge className="bg-amber-100 text-amber-800">Update</Badge>;
  if (row.decision === 'replace_existing') return <Badge className="bg-red-100 text-red-800">Replace</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-800">Create</Badge>;
}

export default function ProductImportCenter({ open, onOpenChange, onProductMapped }) {
  const {
    job,
    history,
    isBusy,
    progress,
    options,
    summary,
    setOptions,
    validateFile,
    startImport,
    resumeImport,
    rollback,
    downloadErrors,
  } = useBulkImport();
  const inputRef = useRef(null);

  const percent = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  const handleOpenInEditor = (row) => {
    onProductMapped?.(row);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 h-[100dvh] w-screen max-w-none 
        
        <DialogHeader className="border-b px-4 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Product Import Center
          </DialogTitle>
          <DialogDescription>
            Upload Excel or CSV files, validate rows against the current catalog, and import products through the same save workflow used by the manual product editor.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="flex h-full min-h-0 flex-col">
          <div className="border-b px-4 py-3 sm:px-6">
            <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="import">Import</TabsTrigger>
              <TabsTrigger value="history">Import History</TabsTrigger>
            </TabsList>
          </div>

          <div className="grid min-h-0 grid-cols-1 gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6">
            <div className="grid min-h-0 grid-cols-1 gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6">
              <div className="space-y-4 pr-1 lg:max-h-[calc(90vh-11rem)] lg:overflow-y-auto">
                <Card className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">Upload file</h3>
                      <p className="text-sm text-gray-500">Accepted formats: .xlsx, .xls, .csv</p>
                    </div>
                  </div>

                  <input
                    ref={inputRef}
                    type="file"
                    accept={SUPPORTED_IMPORT_ACCEPT}
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        await validateFile(file);
                      } finally {
                        event.target.value = '';
                      }
                    }}
                  />

                  <Button className="w-full gap-2" variant="outline" onClick={() => inputRef.current?.click()} disabled={isBusy}>
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Validate spreadsheet
                  </Button>
                </Card>

                <Card className="space-y-4 p-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Import behavior</h3>
                    <p className="text-sm text-gray-500">Choose how duplicates should be handled before starting the import.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Duplicate mode</Label>
                    <Select value={options.mode} onValueChange={(value) => setOptions((current) => ({ ...current, mode: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select import mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {IMPORT_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">{IMPORT_MODES.find((entry) => entry.value === options.mode)?.description}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Batch size</Label>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={options.batchSize}
                      onChange={(event) => setOptions((current) => ({ ...current, batchSize: Number(event.target.value) || DEFAULT_BATCH_SIZE }))}
                    />
                    <p className="text-xs text-gray-500">Default is 50 products per batch. Lower values are safer for slower connections.</p>
                  </div>
                </Card>

                {job && (
                  <Card className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">Current job</h3>
                        <p className="text-sm text-gray-500">{job.fileName}</p>
                      </div>
                      <Badge variant="outline">{job.status}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs uppercase text-gray-500">Rows</p>
                        <p className="text-lg font-semibold">{job.totalRows}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs uppercase text-gray-500">Ready to import</p>
                        <p className="text-lg font-semibold">{summary?.canImportRows ?? 0}</p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-3">
                        <p className="text-xs uppercase text-red-500">Validation errors</p>
                        <p className="text-lg font-semibold text-red-700">{summary?.failedRows ?? 0}</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 p-3">
                        <p className="text-xs uppercase text-amber-500">Will skip</p>
                        <p className="text-lg font-semibold text-amber-700">{summary?.skippedRows ?? 0}</p>
                      </div>
                    </div>

                    {(job.status === 'importing' || progress.total > 0) && (
                      <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
                        <div className="flex items-center justify-between text-sm font-medium text-blue-900">
                          <span>Import progress</span>
                          <span>{progress.processed} / {progress.total}</span>
                        </div>
                        <Progress value={percent} />
                        <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                          <span>Current batch: {progress.currentBatch || 0}</span>
                          <span>Current row: {progress.currentRow || '—'}</span>
                          <span className="col-span-2 truncate">Current product: {progress.currentProduct || 'Waiting to start'}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => startImport(job.importId)} disabled={isBusy || !job || job.status === 'completed'} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        {job.status === 'importing' ? 'Continue import' : 'Start import'}
                      </Button>
                      {job.errorRows?.length > 0 && (
                        <Button variant="outline" onClick={() => downloadErrors(job.importId)}>
                          Download error report
                        </Button>
                      )}
                    </div>
                  </Card>
                )}
              </div>

              <div className="min-h-0 overflow-hidden">
                <Card className="flex h-full min-h-0 flex-col overflow-hidden">
                  <div className="border-b px-4 py-3">
                    <h3 className="font-semibold text-gray-900">Validation preview</h3>
                    <p className="text-sm text-gray-500">Review the first rows before import. Unknown columns are ignored safely.</p>
                  </div>

                  {!job ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-gray-500">
                      <FileSpreadsheet className="h-10 w-10 text-gray-300" />
                      <div>
                        <p className="font-medium text-gray-700">No spreadsheet loaded yet</p>
                        <p className="text-sm">Validate a file to see auto-mapped rows, duplicate handling, and import readiness.</p>
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="h-full w-full whitespace-nowrap">
                      <div className="min-w-[720px] p-3 sm:min-w-[980px] sm:p-4">
                        {summary?.failedRows > 0 && (
                          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <div>
                              <p className="font-medium">Rows with validation errors will not be imported.</p>
                              <p className="mt-1 text-red-700">You can still proceed. Failed rows will be logged into the downloadable Excel error report.</p>
                            </div>
                          </div>
                        )}

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Row</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Product</TableHead>
                              <TableHead>Brand</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Stock</TableHead>
                              <TableHead>Warnings / Errors</TableHead>
                              <TableHead className="text-right">Editor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(summary?.previewRows || []).map((row) => (
                              <TableRow key={row.rowNumber}>
                                <TableCell className="font-medium">{row.rowNumber}</TableCell>
                                <TableCell><ResultBadge row={row} /></TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 overflow-hidden rounded-lg border bg-gray-50">
                                      {row.image_url ? (
                                        <img src={row.image_url} alt={row.name} className="h-full w-full object-cover" />
                                      ) : (
                                        <div className="flex h-full items-center justify-center text-[10px] text-gray-400">No image</div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">{row.name || 'Untitled product'}</p>
                                      <p className="text-xs text-gray-500">{row.sku || row.barcode || 'No SKU / barcode supplied'}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{row.brand || '—'}</TableCell>
                                <TableCell>
                                  <div>
                                    <p>{row.categoryLabel || row.category || '—'}</p>
                                    {row.subcategory ? <p className="text-xs text-gray-500">{row.subcategory}</p> : null}
                                  </div>
                                </TableCell>
                                <TableCell>{row.price ?? '—'}</TableCell>
                                <TableCell>{row.stock ?? '—'}</TableCell>
                                <TableCell>
                                  <div className="space-y-1 text-xs">
                                    {row.duplicateMatch ? <p className="text-amber-700">Matches existing: {row.duplicateMatch.name}</p> : null}
                                    {row.warnings?.map((warning) => <p key={warning} className="text-amber-700">• {warning}</p>)}
                                    {row.errors?.map((error) => <p key={error} className="text-red-700">• {error}</p>)}
                                    {!row.warnings?.length && !row.errors?.length ? <span className="text-emerald-700">Ready</span> : null}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={row.errors?.length > 0}
                                    onClick={() => handleOpenInEditor(row)}
                                  >
                                    Open in editor
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="m-0 flex-1 min-h-0 overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              {history.length === 0 ? (
                <Card className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center text-gray-500">
                  <History className="h-10 w-10 text-gray-300" />
                  <div>
                    <p className="font-medium text-gray-700">No import history yet</p>
                    <p className="text-sm">Validated and completed imports will appear here for resume, reporting, and rollback.</p>
                  </div>
                </Card>
              ) : history.map((entry) => (
                <Card key={entry.importId} className="p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{entry.fileName}</h3>
                        <Badge variant="outline">{entry.status}</Badge>
                        <Badge className="bg-slate-100 text-slate-700">{entry.mode}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 md:grid-cols-5">
                        <div><span className="font-medium text-gray-900">Rows:</span> {entry.rows}</div>
                        <div><span className="font-medium text-gray-900">Imported:</span> {entry.imported}</div>
                        <div><span className="font-medium text-gray-900">Updated:</span> {entry.updated}</div>
                        <div><span className="font-medium text-gray-900">Skipped:</span> {entry.skipped}</div>
                        <div><span className="font-medium text-gray-900">Failed:</span> {entry.failed}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {entry.canResume && (
                        <Button variant="outline" className="gap-2" onClick={() => resumeImport(entry.importId)} disabled={isBusy}>
                          <Play className="h-4 w-4" /> Resume
                        </Button>
                      )}
                      {entry.errorReportRows > 0 && (
                        <Button variant="outline" onClick={() => downloadErrors(entry.importId)} disabled={isBusy}>
                          Download errors
                        </Button>
                      )}
                      {entry.canRollback && (
                        <Button variant="outline" className="gap-2 border-red-200 text-red-700 hover:bg-red-50" onClick={() => rollback(entry.importId)} disabled={isBusy}>
                          <RotateCcw className="h-4 w-4" /> Rollback
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
