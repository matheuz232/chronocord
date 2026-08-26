import React, { useEffect, useMemo, useState } from "react";

const DB_NAME = "chronocord-stickers-v1";
const STORE_NAME = "items";
const LOCAL_META_KEY = "cc_sticker_studio_meta_v1";
const GIPHY_KEY_STORAGE = "cc_giphy_api_key_v1";

function openDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("IndexedDB indisponível neste dispositivo."));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Não foi possível abrir o armazenamento."));
  });
}

async function dbPut(item) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => { db.close(); resolve(item); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function dbDelete(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function dbAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

function dataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function cardStyle(active, T, themeColor) {
  return {
    border: `1px solid ${active ? themeColor : T.border}`,
    background: active ? `${themeColor}12` : T.bg1,
    borderRadius: 12,
  };
}

export default function StickerStudio({ T, themeColor }) {
  const [tab, setTab] = useState("meus");
  const [items, setItems] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [kind, setKind] = useState("sticker");
  const [status, setStatus] = useState("");
  const [giphyKey, setGiphyKey] = useState(() => localStorage.getItem(GIPHY_KEY_STORAGE) || "");
  const [giphyQuery, setGiphyQuery] = useState("");
  const [giphyResults, setGiphyResults] = useState([]);
  const [giphyLoading, setGiphyLoading] = useState(false);
  const [giphyError, setGiphyError] = useState("");
  const [rating, setRating] = useState("pg-13");

  useEffect(() => {
    let alive = true;
    dbAll().then((all) => { if (alive) setItems(all.sort((a, b) => b.createdAt - a.createdAt)); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    return () => { if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const localItems = useMemo(() => items.filter((x) => x.kind !== "giphy"), [items]);
  const giphyItems = useMemo(() => items.filter((x) => x.kind === "giphy"), [items]);

  async function chooseFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|gif|webp)$/i.test(file.type)) {
      setStatus("Use PNG, JPG, GIF ou WEBP.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setStatus("Arquivo muito grande. O limite local é 12 MB.");
      return;
    }
    setSelectedFile(file);
    setStatus("");
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function saveLocalSticker() {
    if (!selectedFile) return setStatus("Escolha uma imagem ou GIF primeiro.");
    const cleanName = name.trim().slice(0, 48) || selectedFile.name.replace(/\.[^/.]+$/, "");
    setStatus("Salvando…");
    try {
      const src = await dataUrl(selectedFile);
      const item = {
        id: crypto.randomUUID(),
        kind,
        name: cleanName,
        tags: tags.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12),
        mime: selectedFile.type,
        src,
        createdAt: Date.now(),
      };
      await dbPut(item);
      setItems((prev) => [item, ...prev]);
      setSelectedFile(null);
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setName("");
      setTags("");
      setStatus("Figurinha salva na sua biblioteca.");
    } catch (error) {
      setStatus(error?.message || "Não foi possível salvar a figurinha.");
    }
  }

  async function removeItem(id) {
    try {
      await dbDelete(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {
      setStatus("Não foi possível remover este item.");
    }
  }

  async function searchGiphy(event, mode = "gifs") {
    event?.preventDefault?.();
    const key = giphyKey.trim();
    if (!key) {
      setGiphyError("Adicione uma chave da API do GIPHY para pesquisar.");
      return;
    }
    const q = giphyQuery.trim();
    if (!q) return setGiphyError("Digite o que você quer encontrar.");
    setGiphyLoading(true);
    setGiphyError("");
    try {
      const endpoint = mode === "stickers" ? "stickers/search" : "gifs/search";
      const params = new URLSearchParams({ api_key: key, q: q.slice(0, 50), limit: "24", rating, lang: "pt" });
      const response = await fetch(`https://api.giphy.com/v1/${endpoint}?${params.toString()}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.meta?.msg || `GIPHY respondeu HTTP ${response.status}.`);
      setGiphyResults((body.data || []).map((x) => ({
        id: x.id,
        title: x.title || "GIF",
        url: x.images?.fixed_width?.url || x.images?.original?.url,
        original: x.images?.original?.url,
        preview: x.images?.fixed_width_small?.url || x.images?.fixed_width?.url,
        username: x.user?.display_name || x.username || "",
      })).filter((x) => x.url));
      localStorage.setItem(GIPHY_KEY_STORAGE, key);
    } catch (error) {
      setGiphyError(error?.message || "Não foi possível consultar o GIPHY.");
    } finally {
      setGiphyLoading(false);
    }
  }

  async function addGiphy(result) {
    const item = { id: `giphy-${result.id}`, kind: "giphy", name: result.title || "GIF do GIPHY", src: result.url, original: result.original, preview: result.preview, username: result.username, createdAt: Date.now() };
    try {
      await dbPut(item);
      setItems((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
      setStatus("GIF adicionado à sua biblioteca.");
    } catch {
      setStatus("Não foi possível salvar este GIF.");
    }
  }

  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Figurinhas e GIFs</div>
      <div style={{ color: "#aaaab5", fontSize: 13, lineHeight: 1.55, marginBottom: 20 }}>
        Crie sua própria biblioteca de figurinhas, importe GIFs e pesquise conteúdo no GIPHY. A biblioteca local usa armazenamento do aplicativo e não depende de uploads para o servidor.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[["meus", "Minha biblioteca"], ["criar", "Criar figurinha"], ["giphy", "GIPHY"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...cardStyle(tab === id, T, themeColor), color: T.textMain, padding: "9px 14px", cursor: "pointer", fontWeight: 650 }}>{label}</button>
        ))}
      </div>

      {tab === "criar" && (
        <div style={{ ...cardStyle(false, T, themeColor), padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(280px,360px)", gap: 18 }}>
            <div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                <label style={{ border: `1px dashed ${themeColor}`, background: `${themeColor}12`, color: T.textMain, borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 650 }}>
                  Escolher imagem / GIF
                  <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => chooseFile(e.target.files?.[0])} style={{ display: "none" }} />
                </label>
                <button onClick={() => { setKind("sticker"); setStatus(""); }} style={{ ...cardStyle(kind === "sticker", T, themeColor), color: T.textMain, padding: "10px 14px", cursor: "pointer" }}>Figurinha</button>
                <button onClick={() => { setKind("gif"); setStatus(""); }} style={{ ...cardStyle(kind === "gif", T, themeColor), color: T.textMain, padding: "10px 14px", cursor: "pointer" }}>GIF</button>
              </div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da figurinha" style={{ width: "100%", background: "#24252b", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: "#fff", outline: "none", marginBottom: 10 }} />
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (ex.: feliz, meme, gato)" style={{ width: "100%", background: "#24252b", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: "#fff", outline: "none", marginBottom: 10 }} />
              <div style={{ fontSize: 11.5, color: "#999aa5", marginBottom: 14 }}>Use arquivos de até 12 MB. GIFs são preservados como animação.</div>
              <button onClick={saveLocalSticker} style={{ border: 0, background: themeColor, color: T.text, borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>Salvar na biblioteca</button>
              {status && <div style={{ fontSize: 12, color: status.includes("não") || status.includes("Não") ? "#ff7777" : "#9c9cab", marginTop: 10 }}>{status}</div>}
            </div>
            <div style={{ ...cardStyle(false, T, themeColor), padding: 12, minHeight: 240, display: "grid", placeItems: "center", overflow: "hidden" }}>
              {previewUrl ? <img src={previewUrl} alt="Prévia da figurinha" style={{ maxWidth: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 10, background: "transparent" }} /> : <div style={{ color: "#777987", textAlign: "center" }}>Sua prévia aparecerá aqui</div>}
            </div>
          </div>
        </div>
      )}

      {tab === "giphy" && (
        <div>
          <div style={{ ...cardStyle(false, T, themeColor), padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input type="password" value={giphyKey} onChange={(e) => setGiphyKey(e.target.value)} placeholder="Chave da API do GIPHY" style={{ flex: 1, background: "#24252b", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: "#fff", outline: "none" }} />
              <select value={rating} onChange={(e) => setRating(e.target.value)} style={{ width: 110, background: "#24252b", border: `1px solid ${T.border}`, borderRadius: 8, color: "#fff", padding: "8px" }}><option value="g">G</option><option value="pg">PG</option><option value="pg-13">PG-13</option><option value="r">R</option></select>
            </div>
            <form onSubmit={(e) => searchGiphy(e, "gifs")} style={{ display: "flex", gap: 8 }}>
              <input value={giphyQuery} onChange={(e) => setGiphyQuery(e.target.value)} placeholder="Pesquisar no GIPHY…" style={{ flex: 1, background: "#24252b", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: "#fff", outline: "none" }} />
              <button disabled={giphyLoading} style={{ border: 0, background: themeColor, color: T.text, borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>{giphyLoading ? "Buscando…" : "Buscar"}</button>
            </form>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={(e) => searchGiphy(e, "gifs")} style={{ border: `1px solid ${T.border}`, background: T.bg1, color: T.textMain, borderRadius: 8, padding: "7px 11px", cursor: "pointer" }}>GIFs</button>
              <button onClick={(e) => searchGiphy(e, "stickers")} style={{ border: `1px solid ${T.border}`, background: T.bg1, color: T.textMain, borderRadius: 8, padding: "7px 11px", cursor: "pointer" }}>Stickers</button>
            </div>
            {giphyError && <div style={{ color: "#ff7777", fontSize: 12, marginTop: 9 }}>{giphyError}</div>}
            <div style={{ color: "#7f8090", fontSize: 11, marginTop: 9 }}>Powered by GIPHY</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
            {giphyResults.map((result) => <div key={result.id} style={{ ...cardStyle(false, T, themeColor), padding: 8 }}><div style={{ height: 110, background: "#24252b", borderRadius: 8, overflow: "hidden", display: "grid", placeItems: "center" }}><img src={result.preview || result.url} alt={result.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div><div style={{ fontSize: 11, color: T.textDim, marginTop: 7, minHeight: 28, overflow: "hidden" }}>{result.title}</div><button onClick={() => addGiphy(result)} style={{ width: "100%", border: 0, background: themeColor, color: T.text, borderRadius: 7, padding: "7px 9px", cursor: "pointer", fontWeight: 650, marginTop: 6 }}>Adicionar</button></div>)}
          </div>
        </div>
      )}

      {tab === "meus" && (
        <div>
          {items.length === 0 ? <div style={{ ...cardStyle(false, T, themeColor), padding: 30, textAlign: "center", color: "#8f909b" }}>Sua biblioteca está vazia. Crie uma figurinha ou adicione um GIF do GIPHY.</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>{items.map((item) => <div key={item.id} style={{ ...cardStyle(false, T, themeColor), padding: 8 }}><div style={{ height: 120, background: "#24252b", borderRadius: 8, overflow: "hidden", display: "grid", placeItems: "center" }}><img src={item.src} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div><div style={{ fontSize: 11.5, color: T.textMain, fontWeight: 650, marginTop: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 }}><span style={{ fontSize: 10, color: "#80818f" }}>{item.kind === "giphy" ? "GIPHY" : item.kind.toUpperCase()}</span><button onClick={() => removeItem(item.id)} style={{ border: 0, background: "transparent", color: "#ff7777", cursor: "pointer", fontSize: 10.5 }}>Remover</button></div></div>)}</div>}
          {giphyItems.length > 0 && <div style={{ marginTop: 18, fontSize: 11.5, color: "#888996" }}>Sua biblioteca local mantém referências aos GIFs do GIPHY; eles continuam sendo carregados do endereço do provedor quando exibidos.</div>}
        </div>
      )}
    </div>
  );
}
