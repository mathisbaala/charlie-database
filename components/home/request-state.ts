export type RequestState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

export const defaultState = <T,>(): RequestState<T> => ({
  loading: false,
  error: null,
  data: null,
});
