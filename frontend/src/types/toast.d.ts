type IToastSuccess = (message: string) => void;
type IToastError = (error: Error | string, displayReport?: boolean) => void;
type IToastAction = (
  message: string,
  actionLabel: string,
  action: () => void | Promise<void>,
  timeout?: number
) => void;
