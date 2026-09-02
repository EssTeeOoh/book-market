import { createClient } from "@/lib/supabase/server";

export default async function SupabaseTestPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("books")
    .select("id, title, status")
    .limit(10);

  return (
    <main>
      <h1>Supabase Test</h1>

      {error ? (
        <pre>{error.message}</pre>
      ) : (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      )}
    </main>
  );
}