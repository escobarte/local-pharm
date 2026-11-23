// One row of public.amdm_registry as the app uses it (camelCase).

export type RegistryItem = {
  code: string;
  name: string;
  form: string | null;
  dose: string | null;
  volume: string | null;
  packSize: string | null;
  inn: string | null;
  atc: string | null;
  manufacturer: string | null;
  country: string | null;
  barcode: string | null;
  rx: boolean | null;
};
