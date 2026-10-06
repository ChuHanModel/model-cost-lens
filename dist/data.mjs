const data = await (await fetch(new URL("./snapshot.json", import.meta.url))).json();
export const snapshot = data.models;
export const metadata = data.metadata;
