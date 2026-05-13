import { useQuery } from '@tanstack/react-query'

/**
 * Custom hook for fetching data from API
 * @param {string} key - Query key for caching
 * @param {function} queryFn - Async function that fetches data
 * @returns {object} - { data, isLoading, error, refetch }
 */
export function useFetch(key, queryFn) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [key],
    queryFn,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return { data, isLoading, error, refetch }
}

/**
 * Custom hook for mutations (POST, PUT, DELETE)
 */
export function useMutation(mutationFn) {
  const {
    mutate,
    mutateAsync,
    isPending,
    error,
    data,
  } = useQuery({
    mutationFn,
  })

  return { mutate, mutateAsync, isPending, error, data }
}
