type DatabaseError = { code?: string; message?: string };

type DeleteResult = { error: DatabaseError | null };

export function isMissingOptionalSchemaObject(error: DatabaseError | null) {
  return !!error && ["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "");
}

export async function deleteOptionalRows(deleteRows: () => PromiseLike<DeleteResult>) {
  const { error } = await deleteRows();
  if (error && !isMissingOptionalSchemaObject(error)) throw error;
}
