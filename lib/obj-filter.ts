import { Dictionary } from './types/dictionary'

export function objFilter<T = any> (original: Dictionary<T>, filter: (k: string, v: T) => boolean = () => true) {
  const obj: Dictionary<T> = {}
  Object.keys(original || {}).forEach((key) => {
    if (filter(key, original[key])) {
      obj[key] = original[key]
    }
  })
  return obj
}
