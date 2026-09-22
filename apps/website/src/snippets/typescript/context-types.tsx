import { createContext, type InferAPI } from 'react-global-state-hooks';

export const FormContext = createContext({ name: '', email: '' });

// Works with the object returned by createContext, or with its `Context`.
export type FormApi = InferAPI<typeof FormContext>;

export function resetForm(api: FormApi) {
  api.setState({ name: '', email: '' });
}
