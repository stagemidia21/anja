import { isCPF as isCpfFn, isCNPJ as isCnpjFn } from 'validation-br'

export function isCPF(value: string): boolean {
  return isCpfFn(value)
}

export function isCNPJ(value: string): boolean {
  return isCnpjFn(value)
}

export function stripMask(value: string): string {
  return value.replace(/\D/g, '')
}
