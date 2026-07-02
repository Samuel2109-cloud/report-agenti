/* =========================================================================
   CRM REAL TIME VENDITORI - ENGINE STATICO (VANILLA JAVASCRIPT)
   ========================================================================= */

// ─── CONFIGURAZIONE UTENTE ───────────────────────────────────────────────
// Inserisci qui il link (URL Web App) fornito da Google Apps Script dopo il deployment
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXra7cSob4cpuzmtSjlhbUs10onnPQqa4QXU-YM-zYWa6ygweqXPjgMvt-d4wkNY2lVg/exec";

// ─── STATO DELL'APPLICAZIONE (DATABASE IN MEMORIA) ───────────────────────
const FALLBACK_VENDITORI = [
  "ADDONIZIO GIOVANNI - PUGLIA",
  "BENEDETTO CAVALLO - LOMBARDIA",
  "BRUNETTI LETIZIA - MARCHE",
  "CAGNO DANIELE (SALVATORE) - SICILIA",
  "CANOVA STEFANO - LOMBARDIA",
  "CAPO FRANCHINO PAOLO - LOMBARDIA / VENETO",
  "CARRANI STEFANO - TOSCANA",
  "CHIAPPA STEFANIA - LIGURIA / TOSCANA",
  "COLOMBO TIZIANO - LOMBARDIA",
  "CONTINO GIUSEPPE - CAMPANIA",
  "COSIMO CALABRESE - SICILIA",
  "CROCI STEFANO - EMILIA-ROMAGNA",
  "DA VERO EMILIO - LOMBARDIA",
  "DI PAOLA LUIGI - CAMPANIA",
  "DONNINI SERENA - PUGLIA",
  "FALASCHETTI ANDREA - MARCHE",
  "FERRI ANDREA (BOLLE BLU SRLS) - PIEMONTE",
  "FRANCESCA SCHIRMO - SICILIA",
  "GIANLUCA FABRIZIO CEDRO - PIEMONTE",
  "GIACOMELLI SERGIO - LOMBARDIA",
  "IEMMA RICCARDO - LOMBARDIA",
  "LIBRETTI MARCO - EMILIA-ROMAGNA",
  "LO CASCIO ANDREA - SICILIA",
  "LUCCI LUCIANO - ABRUZZO",
  "MATTEO BALDAN - LOMBARDIA",
  "MINETTI STEFANO - VALLE D'AOSTA / PIEMONTE",
  "MORITTU ALDO - EMILIA-ROMAGNA",
  "MOTTA GIOVANNI - EMILIA-ROMAGNA",
  "MOTTA GIOVANNI - LOMBARDIA",
  "NICOLA AGOSTINO - PIEMONTE",
  "NIRTA TOMMASO - PIEMONTE",
  "PALLADINO PIETRO - LAZIO",
  "PAOLO TEBAI - LOMBARDIA",
  "PAOLO TEBAI - PIEMONTE",
  "PIOZZI FABIO WARNER - LOMBARDIA",
  "PITARO ENRICO - VENETO",
  "PIZZATI TIZIANO - VENETO",
  "POZZANI LUCA - VENETO",
  "PROVASI ALESSANDRO - EMILIA-ROMAGNA",
  "PROVASI ALESSANDRO - VENETO",
  "RICCIARDI FERRUCCIO - CAMPANIA",
  "RIZZI VALTER - PIEMONTE / LOMBARDIA",
  "SAIONI MAURO - UMBRIA / TOSCANA",
  "TAMIGI MARCO - LOMBARDIA",
  "TANI ANDREA - TOSCANA",
  "TRANFAGLIA LUIGI - UMBRIA / TOSCANA",
  "VALZOLGHER ANDREA - TRENTINO-ALTO ADIGE / VENETO",
  "VISENTIN DAVIDE - LOMBARDIA",
  "VISEGLIA VITO - PIEMONTE"
];

let database = [];
let listaVenditori = [...FALLBACK_VENDITORI];
let activeTab = "foglio1";
let isModalOpen = false;
let modId = null;
let isFirstLoad = true;

// ─── UTILITY DATE & TESTO ────────────────────────────────────────────────
function oggiISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split("T")[0];
}

function primoDelMeseISO() {
  return oggiISO().substring(0, 8) + "01";
}

function formattaDataPerTabellaVisiva(stringa) {
  if (!stringa) return "";
  const parti = stringa.split("-");
  if (parti.length === 3) {
    return `${parti[2]}/${parti[1]}/${parti[0]}`;
  }
  return stringa;
}

function estraiDataYMD(valore) {
  if (!valore) return "";
  const s = String(valore).trim();
  
  // Se ha formato ISO con T o spazio
  const tIdx = s.indexOf("T");
  let dataParte = tIdx !== -1 ? s.substring(0, tIdx) : s;
  const spazioIdx = dataParte.indexOf(" ");
  if (spazioIdx !== -1) {
    dataParte = dataParte.substring(0, spazioIdx);
  }
  
  // Se è già YYYY-MM-DD
  const mYMD = dataParte.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (mYMD) return dataParte;

  // Se è DD/MM/YYYY
  const mDMY = dataParte.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mDMY) {
    const d = mDMY[1].padStart(2, "0");
    const m = mDMY[2].padStart(2, "0");
    const y = mDMY[3];
    return `${y}-${m}-${d}`;
  }
  return "";
}

function giorniTraDate(inizio, fine) {
  if (!inizio || !fine) return 0;
  const a = new Date(inizio);
  const b = new Date(fine);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function generaListaDatePeriodo(inizio, fine) {
  if (!inizio || !fine || inizio > fine) return [];
  const lista = [];
  let corrente = new Date(inizio);
  const dataFine = new Date(fine);
  while (corrente <= dataFine) {
    lista.push(corrente.toISOString().split("T")[0]);
    corrente.setDate(corrente.getDate() + 1);
  }
  return lista;
}

function valoreTesto(valore) {
  if (valore === null || valore === undefined) return "";
  if (typeof valore === "object") {
    const chiavi = ["nome", "venditore", "agente", "name", "value", "text"];
    for (const chiave of chiavi) {
      if (valore[chiave] !== null && valore[chiave] !== undefined) {
        return valoreTesto(valore[chiave]);
      }
    }
    if (Array.isArray(valore)) return valoreTesto(valore[0]);
    return "";
  }
  return String(valore).trim();
}

function nomeNormalizzato(valore) {
  const norm = valoreTesto(valore).trim().toUpperCase();
  if (!norm || /^\d+$/.test(norm) || norm === "UNDEFINED" || norm === "[OBJECT OBJECT]" || norm === "ID" || norm === "VENDITORE") {
    return "";
  }
  return norm;
}

function numeroPulito(valore) {
  const n = Number(String(valore ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// Unione tra i venditori caricati dal cloud e quelli presenti nel database dei record
function getListaVenditoriCompleta() {
  const set = new Set([...listaVenditori]);
  database.forEach((r) => {
    if (r.venditore) set.add(r.venditore);
  });
  return [...set].sort();
}

// ─── CONTROLLO CARICAMENTO (LOADING SPINNER) ─────────────────────────────
function mostraLoading(show) {
  const indicator = document.getElementById("loading-indicator");
  if (indicator) {
    indicator.style.display = show ? "block" : "none";
  }
}

// ─── INIZIALIZZAZIONE ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Imposta date iniziali degli input
  const oggi = oggiISO();
  const inizioMese = primoDelMeseISO();

  document.getElementById("ins-data-riferimento").value = oggi;
  document.getElementById("ins-data-inserimento").value = oggi;
  document.getElementById("ins-data-chiamata").value = oggi;

  document.getElementById("f2-inizio").value = inizioMese;
  document.getElementById("f2-fine").value = oggi;

  document.getElementById("f3-inizio").value = inizioMese;
  document.getElementById("f3-fine").value = oggi;

  document.getElementById("f4-inizio").value = inizioMese;
  document.getElementById("f4-fine").value = oggi;

  document.getElementById("f6-data").value = oggi;

  document.getElementById("f7-inizio").value = inizioMese;
  document.getElementById("f7-fine").value = oggi;

  document.getElementById("f8-data").value = oggi;

  // Caricamento asincrono dati
  caricaVenditoriDalCloud();
  caricaDatiDalCloud();

  // Registra Eventi UI
  inizializzaEventiUI();

  // Auto-refresh periodico continuo ogni 30 secondi per aggiornare dati e tendine dallo sheet
  setInterval(() => {
    caricaVenditoriDalCloud();
    caricaDatiDalCloud();
  }, 30000);
});

// ─── REGISTRAZIONE EVENTI UI ─────────────────────────────────────────────
function inizializzaEventiUI() {
  // Pulsante Refresh Manuale Dati
  const btnRefresh = document.getElementById("btn-refresh-dati");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      mostraLoading(true);
      caricaVenditoriDalCloud();
      caricaDatiDalCloud();
      // Effetto visivo di rotazione o feedback
      btnRefresh.style.opacity = "0.7";
      setTimeout(() => { btnRefresh.style.opacity = "1"; }, 500);
    });
  }

  // Cambio Tab
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const tabId = btn.getAttribute("data-tab");
      if (tabId) {
        switchTab(tabId);
      }
    });
  });

  // Salva Dati (Foglio 1)
  document.getElementById("btn-invia-dati").addEventListener("click", salvaDati);

  // Aggiungi Agente Manuale (Foglio 1)
  document.getElementById("btn-aggiungi-agente").addEventListener("click", aggiungiAgenteManuale);

  // Eventi per Filtri di Ricerca
  document.getElementById("f2-venditore").addEventListener("change", renderFoglio2);
  document.getElementById("f2-inizio").addEventListener("change", renderFoglio2);
  document.getElementById("f2-fine").addEventListener("change", renderFoglio2);

  document.getElementById("f3-parametro").addEventListener("change", renderFoglio3);
  document.getElementById("f3-inizio").addEventListener("change", renderFoglio3);
  document.getElementById("f3-fine").addEventListener("change", renderFoglio3);

  document.getElementById("f4-inizio").addEventListener("change", renderFoglio4);
  document.getElementById("f4-fine").addEventListener("change", renderFoglio4);

  document.getElementById("f6-data").addEventListener("change", renderFoglio6);

  document.getElementById("f7-venditore").addEventListener("change", renderFoglio7);
  document.getElementById("f7-inizio").addEventListener("change", renderFoglio7);
  document.getElementById("f7-fine").addEventListener("change", renderFoglio7);

  document.getElementById("f8-data").addEventListener("change", renderFoglio8);

  // Azioni Modifica Modale
  document.getElementById("btn-salva-modifica").addEventListener("click", salvaModifica);
  document.getElementById("btn-annulla-modifica").addEventListener("click", chiudiModifica);
}

// ─── FUNZIONI DI NAVIGAZIONE TAB ──────────────────────────────────────────
function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    if (btn.getAttribute("data-tab") === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  document.querySelectorAll(".tab-content").forEach((sec) => {
    if (sec.id === tabId) {
      sec.classList.add("active");
    } else {
      sec.classList.remove("active");
    }
  });

  renderActiveTab();
}

// Rendering specifico del tab attivo per migliorare le performance
function renderActiveTab() {
  if (activeTab === "foglio2") renderFoglio2();
  else if (activeTab === "foglio3") renderFoglio3();
  else if (activeTab === "foglio4") renderFoglio4();
  else if (activeTab === "foglio6") renderFoglio6();
  else if (activeTab === "foglio7") renderFoglio7();
  else if (activeTab === "foglio8") renderFoglio8();
  else if (activeTab === "foglio9") renderFoglio9();
  else if (activeTab === "foglio5") renderFoglio5();
}

// ─── CARICAMENTO DATI DAL CLOUD ───────────────────────────────────────────────
function caricaDatiDalCloud() {
  mostraLoading(true);
  fetch(`${GOOGLE_SCRIPT_URL}?action=getDati&t=${Date.now()}`, { cache: "no-store" })
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data)) {
        database = data.map((r) => {
          const dataInserimentoRaw = estraiDataYMD(r.dataInserimento || r.data_inserimento);
          const dataChiamataRaw = estraiDataYMD(r.dataChiamata || r.data_chiamata) || dataInserimentoRaw || oggiISO();
          const dataModificaRaw = estraiDataYMD(r.dataModifica || r.data_modifica);
          const dataRiferimentoRaw = estraiDataYMD(r.dataRiferimento || r.data_riferimento) || dataInserimentoRaw || dataChiamataRaw || oggiISO();

          return {
            id: numeroPulito(r.id) || Date.now() + Math.random(),
            data: dataRiferimentoRaw, // Mappa a Data Riferimento Dati per i filtri di tutti i fogli
            dataInserimento: dataInserimentoRaw || dataRiferimentoRaw,
            dataChiamata: dataChiamataRaw,
            dataModifica: dataModificaRaw,
            dataRiferimento: dataRiferimentoRaw,
            venditore: nomeNormalizzato(r.venditore ?? r.agente ?? r.nome),
            lead: numeroPulito(r.lead),
            appuntamenti: numeroPulito(r.appuntamenti),
            giacenze: numeroPulito(r.giacenze),
            agenda: numeroPulito(r.agenda),
            visite: numeroPulito(r.visite),
            caldi: numeroPulito(r.caldi),
            contratti: numeroPulito(r.contratti),
            reattivo: valoreTesto(r.reattivo || "REATTIVO"),
            oversell: valoreTesto(r.oversell || "NO"),
            soprPen: numeroPulito(r.soprPen),
            vendPen: numeroPulito(r.vendPen),
            prevConc: valoreTesto(r.prevConc),
            nomiCaldi: valoreTesto(r.nomiCaldi),
            contrEntrati: valoreTesto(r.contrEntrati),
            note: valoreTesto(r.note),
          };
        }).filter((r) => r.venditore);
        
        // Estraiamo dinamicamente in tempo reale tutti i venditori unici presenti nel database caricato
        const setVenditori = new Set([...listaVenditori]);
        database.forEach((r) => {
          if (r.venditore) {
            setVenditori.add(r.venditore);
          }
        });
        listaVenditori = [...setVenditori].filter(v => v && v.trim() !== "");
        listaVenditori.sort();
        
        // Se è il primo caricamento, impostiamo i filtri in modo che contengano tutti i dati presenti nel database
        if (isFirstLoad && database.length > 0) {
          const dateValide = database.map((r) => r.data).filter((d) => d && d.match(/^\d{4}-\d{2}-\d{2}$/)).sort();
          if (dateValide.length > 0) {
            const dataMinima = dateValide[0];
            const dataMassima = dateValide[dateValide.length - 1];

            document.getElementById("f2-inizio").value = dataMinima;
            document.getElementById("f2-fine").value = dataMassima;

            document.getElementById("f3-inizio").value = dataMinima;
            document.getElementById("f3-fine").value = dataMassima;

            document.getElementById("f4-inizio").value = dataMinima;
            document.getElementById("f4-fine").value = dataMassima;

            document.getElementById("f6-data").value = dataMassima;

            document.getElementById("f7-inizio").value = dataMinima;
            document.getElementById("f7-fine").value = dataMassima;

            document.getElementById("f8-data").value = oggiISO();
          }
          isFirstLoad = false;
        }

        // Aggiorna le viste dopo aver caricato i dati
        aggiornaSelectVenditori();
        renderActiveTab();
      }
      mostraLoading(false);
    })
    .catch((err) => {
      console.error("Errore caricamento dati:", err);
      mostraLoading(false);
    });
}

function caricaVenditoriDalCloud() {
  fetch(`${GOOGLE_SCRIPT_URL}?action=getAgenti&t=${Date.now()}`, { cache: "no-store" })
    .then((res) => res.json())
    .then((data) => {
      const sorgente = Array.isArray(data) ? data : (Array.isArray(data?.venditori) ? data.venditori : []);
      const loaded = sorgente
        .map(nomeNormalizzato)
        .filter((v) => v !== "" && v !== "UNDEFINED" && v !== "[OBJECT OBJECT]");
      
      // Uniamo sempre i venditori caricati dal cloud con quelli di fallback di default.
      // In questo modo l'applicazione mostra immediatamente tutti i 17 venditori principali da colonna B
      // e allo stesso tempo supporta pienamente l'aggiunta dinamica di nuovi venditori!
      const setVenditori = new Set([...loaded, ...FALLBACK_VENDITORI]);
      listaVenditori = [...setVenditori].filter(v => v && v.trim() !== "");
      listaVenditori.sort();
      aggiornaSelectVenditori();
    })
    .catch((err) => {
      console.error("Errore caricamento venditori:", err);
      listaVenditori = [...FALLBACK_VENDITORI];
      listaVenditori.sort();
      aggiornaSelectVenditori();
    });
}

// Popola dinamicamente tutte le select del venditore
function aggiornaSelectVenditori() {
  const venditoriCompleti = getListaVenditoriCompleta();

  // 1. Select Foglio 1
  const selF1 = document.getElementById("ins-venditore");
  const f1Val = selF1.value;
  selF1.innerHTML = '<option value="">-- SELEZIONA VENDITORE --</option>';
  venditoriCompleti.forEach((v) => {
    selF1.innerHTML += `<option value="${v}">${v}</option>`;
  });
  selF1.value = f1Val;

  // 2. Select Foglio 2
  const selF2 = document.getElementById("f2-venditore");
  const f2Val = selF2.value;
  selF2.innerHTML = '<option value="ALL">-- TUTTI I VENDITORI --</option>';
  venditoriCompleti.forEach((v) => {
    selF2.innerHTML += `<option value="${v}">${v}</option>`;
  });
  selF2.value = f2Val;

  // 3. Select Foglio 7
  const selF7 = document.getElementById("f7-venditore");
  const f7Val = selF7.value;
  selF7.innerHTML = '<option value="">-- SELEZIONA AGENTE --</option>';
  venditoriCompleti.forEach((v) => {
    selF7.innerHTML += `<option value="${v}">${v}</option>`;
  });
  if (f7Val && venditoriCompleti.includes(f7Val)) {
    selF7.value = f7Val;
  } else if (venditoriCompleti.length > 0) {
    selF7.value = venditoriCompleti[0];
  }

  // 4. Select Modale Modifica
  const selMod = document.getElementById("mod-venditore");
  const modVal = selMod.value;
  selMod.innerHTML = '<option value="">-- SELEZIONA VENDITORE --</option>';
  venditoriCompleti.forEach((v) => {
    selMod.innerHTML += `<option value="${v}">${v}</option>`;
  });
  selMod.value = modVal;
}

// ─── AZIONI DI SCRITTURA DATI ────────────────────────────────────────────

function aggiungiAgenteManuale() {
  const nuovoAgenteEl = document.getElementById("ins-nuovo-agente");
  const nome = nomeNormalizzato(nuovoAgenteEl.value);
  if (!nome) {
    alert("Inserisci il nome del nuovo agente!");
    return;
  }

  if (!listaVenditori.includes(nome)) {
    listaVenditori.push(nome);
    listaVenditori.sort();
  }
  
  aggiornaSelectVenditori();
  document.getElementById("ins-venditore").value = nome;
  nuovoAgenteEl.value = "";

  const oggi = oggiISO();
  const insDataInserimento = document.getElementById("ins-data-inserimento").value || oggi;
  const record = {
    id: Date.now(),
    dataInserimento: insDataInserimento,
    dataChiamata: document.getElementById("ins-data-chiamata").value || oggi,
    dataRiferimento: document.getElementById("ins-data-riferimento").value || insDataInserimento,
    venditore: nome,
    lead: 0,
    appuntamenti: 0,
    giacenze: 0,
    agenda: 0,
    visite: 0,
    caldi: 0,
    contratti: 0,
    reattivo: "REATTIVO",
    oversell: "NO",
    soprPen: 0,
    vendPen: 0,
    prevConc: "",
    nomiCaldi: "",
    contrEntrati: "",
    note: "AGENTE INSERITO MANUALMENTE"
  };

  mostraLoading(true);
  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({ action: "salva", record })
  })
    .then(() => {
      alert("✅ Agente aggiunto e registrato nel Foglio1!");
      setTimeout(() => {
        caricaVenditoriDalCloud();
        caricaDatiDalCloud();
      }, 1200);
    })
    .catch((err) => {
      alert("Errore nell'aggiungere l'agente: " + err);
      mostraLoading(false);
    });
}

function salvaDati() {
  const insVenditore = document.getElementById("ins-venditore").value;
  const insDataRiferimento = document.getElementById("ins-data-riferimento").value;
  const insDataInserimento = document.getElementById("ins-data-inserimento").value;
  const insDataChiamata = document.getElementById("ins-data-chiamata").value;

  if (!insVenditore) {
    alert("Seleziona un venditore!");
    return;
  }
  if (!insDataRiferimento) {
    alert("Compila la Data Riferimento Dati!");
    return;
  }
  if (!insDataInserimento) {
    alert("Compila la Data di Inserimento!");
    return;
  }

  const oggi = oggiISO();
  const record = {
    id: Date.now(),
    dataInserimento: insDataInserimento || oggi,
    dataChiamata: insDataChiamata || oggi,
    dataRiferimento: insDataRiferimento || insDataInserimento || oggi,
    venditore: insVenditore.trim().toUpperCase(),
    lead: parseInt(document.getElementById("ins-lead").value) || 0,
    appuntamenti: parseInt(document.getElementById("ins-appuntamenti").value) || 0,
    giacenze: parseInt(document.getElementById("ins-giacenze").value) || 0,
    agenda: parseInt(document.getElementById("ins-agenda").value) || 0,
    visite: parseInt(document.getElementById("ins-visite").value) || 0,
    caldi: parseInt(document.getElementById("ins-caldi").value) || 0,
    contratti: parseInt(document.getElementById("ins-contratti").value) || 0,
    reattivo: document.getElementById("ins-reattivo").value,
    oversell: document.getElementById("ins-oversell").value,
    soprPen: parseFloat(document.getElementById("ins-sopr-pen").value) || 0,
    vendPen: parseFloat(document.getElementById("ins-vend-pen").value) || 0,
    prevConc: document.getElementById("ins-prev-conc").value,
    nomiCaldi: document.getElementById("ins-nomi-caldi").value,
    contrEntrati: document.getElementById("ins-contr-entr").value,
    note: document.getElementById("ins-note").value,
  };

  mostraLoading(true);
  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({ action: "salva", record })
  })
    .then(() => {
      alert("✅ Dati inviati correttamente su Google Sheets!");
      // Reset form
      document.getElementById("ins-venditore").value = "";
      document.getElementById("ins-lead").value = 0;
      document.getElementById("ins-appuntamenti").value = 0;
      document.getElementById("ins-giacenze").value = 0;
      document.getElementById("ins-agenda").value = 0;
      document.getElementById("ins-visite").value = 0;
      document.getElementById("ins-caldi").value = 0;
      document.getElementById("ins-contratti").value = 0;
      document.getElementById("ins-sopr-pen").value = 0;
      document.getElementById("ins-vend-pen").value = 0;
      document.getElementById("ins-prev-conc").value = "";
      document.getElementById("ins-nomi-caldi").value = "";
      document.getElementById("ins-contr-entr").value = "";
      document.getElementById("ins-note").value = "";
      document.getElementById("ins-data-riferimento").value = oggiISO();
      document.getElementById("ins-data-inserimento").value = oggiISO();
      document.getElementById("ins-data-chiamata").value = oggiISO();
      
      setTimeout(() => {
        caricaVenditoriDalCloud();
        caricaDatiDalCloud();
      }, 1500);
    })
    .catch((err) => {
      alert("Errore nel salvataggio: " + err);
      mostraLoading(false);
    });
}

function eliminaRecord(idRecord) {
  if (!confirm("Sei sicuro di voler eliminare questa riga?")) return;
  mostraLoading(true);
  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({ action: "elimina", id: idRecord })
  })
    .then(() => {
      alert("🗑️ Riga eliminata!");
      setTimeout(() => {
        caricaVenditoriDalCloud();
        caricaDatiDalCloud();
      }, 1000);
    })
    .catch((err) => {
      alert("Errore: " + err);
      mostraLoading(false);
    });
}

// ─── MODALE MODIFICA RECORD ───────────────────────────────────────────────
function apriModifica(idRecord) {
  const r = database.find((rec) => rec.id === idRecord);
  if (!r) {
    alert("Record non trovato.");
    return;
  }

  modId = r.id;
  document.getElementById("mod-data-riferimento").value = r.dataRiferimento || r.data || "";
  document.getElementById("mod-data-inserimento").value = r.dataInserimento || "";
  document.getElementById("mod-data-chiamata").value = r.dataChiamata || "";
  document.getElementById("mod-venditore").value = r.venditore || "";
  document.getElementById("mod-lead").value = r.lead;
  document.getElementById("mod-appuntamenti").value = r.appuntamenti;
  document.getElementById("mod-giacenze").value = r.giacenze;
  document.getElementById("mod-agenda").value = r.agenda;
  document.getElementById("mod-visite").value = r.visite;
  document.getElementById("mod-caldi").value = r.caldi;
  document.getElementById("mod-contratti").value = r.contratti;
  document.getElementById("mod-reattivo").value = r.reattivo || "REATTIVO";
  document.getElementById("mod-oversell").value = r.oversell || "NO";
  document.getElementById("mod-sopr-pen").value = r.soprPen;
  document.getElementById("mod-vend-pen").value = r.vendPen;
  document.getElementById("mod-prev-conc").value = r.prevConc || "";
  document.getElementById("mod-nomi-caldi").value = r.nomiCaldi || "";
  document.getElementById("mod-contr-entr").value = r.contrEntrati || "";
  document.getElementById("mod-note").value = r.note || "";

  document.getElementById("modal-modifica").style.display = "flex";
  isModalOpen = true;
}

function chiudiModifica() {
  document.getElementById("modal-modifica").style.display = "none";
  isModalOpen = false;
  modId = null;
}

function salvaModifica() {
  if (!modId) return;
  const modVenditore = document.getElementById("mod-venditore").value;
  const modDataRiferimento = document.getElementById("mod-data-riferimento").value;
  const modDataInserimento = document.getElementById("mod-data-inserimento").value;
  const venditoreNorm = nomeNormalizzato(modVenditore);

  if (!venditoreNorm) {
    alert("Il nome del venditore non può essere vuoto!");
    return;
  }
  if (!modDataRiferimento) {
    alert("Compila la Data Riferimento Dati!");
    return;
  }
  if (!modDataInserimento) {
    alert("Compila la Data di Inserimento!");
    return;
  }

  const record = {
    id: modId,
    dataChiamata: document.getElementById("mod-data-chiamata").value || "",
    dataInserimento: modDataInserimento || "",
    dataRiferimento: modDataRiferimento || "",
    venditore: venditoreNorm,
    lead: parseInt(document.getElementById("mod-lead").value) || 0,
    appuntamenti: parseInt(document.getElementById("mod-appuntamenti").value) || 0,
    giacenze: parseInt(document.getElementById("mod-giacenze").value) || 0,
    agenda: parseInt(document.getElementById("mod-agenda").value) || 0,
    visite: parseInt(document.getElementById("mod-visite").value) || 0,
    caldi: parseInt(document.getElementById("mod-caldi").value) || 0,
    contratti: parseInt(document.getElementById("mod-contratti").value) || 0,
    reattivo: document.getElementById("mod-reattivo").value,
    oversell: document.getElementById("mod-oversell").value,
    soprPen: parseFloat(document.getElementById("mod-sopr-pen").value) || 0,
    vendPen: parseFloat(document.getElementById("mod-vend-pen").value) || 0,
    prevConc: document.getElementById("mod-prev-conc").value,
    nomiCaldi: document.getElementById("mod-nomi-caldi").value,
    contrEntrati: document.getElementById("mod-contr-entr").value,
    note: document.getElementById("mod-note").value,
  };

  mostraLoading(true);
  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({ action: "modifica", record })
  })
    .then(() => {
      alert("✅ Modifica salvata! (La data di modifica odierna è stata registrata)");
      chiudiModifica();
      setTimeout(() => {
        caricaVenditoriDalCloud();
        caricaDatiDalCloud();
      }, 1200);
    })
    .catch((err) => {
      alert("Errore nella modifica: " + err);
      mostraLoading(false);
    });
}

// ─── RENDERING FOGLIO 2 (REPORT & FILTRI) ─────────────────────────────────
function renderFoglio2() {
  const f2Venditore = document.getElementById("f2-venditore").value;
  const f2Inizio = document.getElementById("f2-inizio").value;
  const f2Fine = document.getElementById("f2-fine").value;

  // Filtra record
  const recordsFiltrati = database.filter((r) => {
    const d = r.data;
    if (f2Inizio && d < f2Inizio) return false;
    if (f2Fine && d > f2Fine) return false;
    if (f2Venditore !== "ALL" && r.venditore !== f2Venditore) return false;
    return true;
  });

  // Calcola KPI
  const kpi = { lead: 0, appuntamenti: 0, giacenze: 0, agenda: 0, visite: 0, caldi: 0, contratti: 0 };
  recordsFiltrati.forEach((r) => {
    kpi.lead += r.lead;
    kpi.appuntamenti += r.appuntamenti;
    kpi.giacenze += r.giacenze;
    kpi.agenda += r.agenda;
    kpi.visite += r.visite;
    kpi.caldi += r.caldi;
    kpi.contratti += r.contratti;
  });

  // Aggiorna KPI a video
  document.getElementById("kpi-f2-lead").innerText = kpi.lead;
  document.getElementById("kpi-f2-appuntamenti").innerText = kpi.appuntamenti;
  document.getElementById("kpi-f2-giacenze").innerText = kpi.giacenze;
  document.getElementById("kpi-f2-agenda").innerText = kpi.agenda;
  document.getElementById("kpi-f2-visite").innerText = kpi.visite;
  document.getElementById("kpi-f2-caldi").innerText = kpi.caldi;
  document.getElementById("kpi-f2-contratti").innerText = kpi.contratti;

  // Renderizza Tabella
  const tbody = document.querySelector("#table-foglio2 tbody");
  tbody.innerHTML = "";

  if (recordsFiltrati.length === 0) {
    tbody.innerHTML = `<tr><td colSpan="18" style="text-align: center; padding: 20px;">Nessun record corrispondente ai filtri impostati.</td></tr>`;
    return;
  }

  recordsFiltrati.forEach((r, idx) => {
    const rigaPrecedente = idx > 0 ? recordsFiltrati[idx - 1] : null;
    const isBreak = rigaPrecedente && rigaPrecedente.venditore !== r.venditore;
    const breakClass = isBreak ? 'class="venditore-break"' : '';

    tbody.innerHTML += `
      <tr ${breakClass}>
        <td>${formattaDataPerTabellaVisiva(r.dataRiferimento)}</td>
        <td>${r.venditore}</td>
        <td>${r.lead}</td>
        <td>${r.appuntamenti}</td>
        <td>${r.giacenze}</td>
        <td>${r.agenda}</td>
        <td>${r.visite}</td>
        <td>${r.caldi}</td>
        <td>${r.contratti}</td>
        <td>${r.reattivo}</td>
        <td>${r.oversell}</td>
        <td>${r.soprPen}%</td>
        <td>${r.vendPen}%</td>
        <td>${r.prevConc}</td>
        <td>${r.nomiCaldi}</td>
        <td>${r.contrEntrati}</td>
        <td>${r.note}</td>
        <td>${formattaDataPerTabellaVisiva(r.dataChiamata)}</td>
      </tr>
    `;
  });
}

// ─── RENDERING FOGLIO 3 (COMPARATIVO VENDITORI) ───────────────────────────
function renderFoglio3() {
  const f3Parametro = document.getElementById("f3-parametro").value;
  const f3Inizio = document.getElementById("f3-inizio").value;
  const f3Fine = document.getElementById("f3-fine").value;

  const dateCol = generaListaDatePeriodo(f3Inizio, f3Fine);
  const venditoriCompleti = getListaVenditoriCompleta();

  // Mappa dati
  const mappa = {};
  database.forEach((r) => {
    const v = r.venditore;
    const d = r.data;
    if (!mappa[v]) mappa[v] = {};
    if (!mappa[v][d]) mappa[v][d] = 0;

    let val = 0;
    if (f3Parametro === "lead") val = r.lead;
    else if (f3Parametro === "appuntamenti") val = r.appuntamenti;
    else if (f3Parametro === "giacenze") val = r.giacenze;
    else if (f3Parametro === "agenda") val = r.agenda;
    else if (f3Parametro === "visite") val = r.visite;
    else if (f3Parametro === "caldi") val = r.caldi;
    else if (f3Parametro === "contratti") val = r.contratti;

    mappa[v][d] += val;
  });

  // Genera Header
  const table = document.getElementById("table-foglio3");
  let theadHTML = `
    <tr>
      <th>Venditore</th>
      <th>Totale</th>
      ${dateCol.map((d) => `<th>${formattaDataPerTabellaVisiva(d)}</th>`).join("")}
    </tr>
  `;
  table.querySelector("thead").innerHTML = theadHTML;

  // Genera Body
  let tbodyHTML = "";
  if (venditoriCompleti.length === 0) {
    tbodyHTML = `<tr><td colspan="${dateCol.length + 2}" style="text-align: center; padding: 20px;">Nessun venditore registrato.</td></tr>`;
  } else {
    venditoriCompleti.forEach((v) => {
      const totale = dateCol.reduce((s, d) => s + (mappa[v]?.[d] || 0), 0);
      tbodyHTML += `
        <tr>
          <td><strong>${v}</strong></td>
          <td><strong>${totale}</strong></td>
          ${dateCol.map((d) => `<td>${mappa[v]?.[d] || 0}</td>`).join("")}
        </tr>
      `;
    });
  }
  table.querySelector("tbody").innerHTML = tbodyHTML;
}

// ─── RENDERING FOGLIO 4 (MULTI PARAMETRO ESTESA) ──────────────────────────
function renderFoglio4() {
  const f4Inizio = document.getElementById("f4-inizio").value;
  const f4Fine = document.getElementById("f4-fine").value;

  const dateCol = generaListaDatePeriodo(f4Inizio, f4Fine);
  const venditoriCompleti = getListaVenditoriCompleta();

  const parametri = [
    { chiave: "lead", etichetta: "Lead Ricevuti" },
    { chiave: "appuntamenti", etichetta: "App.ti Presi" },
    { chiave: "giacenze", etichetta: "Giacenze" },
    { chiave: "agenda", etichetta: "In Agenda" },
    { chiave: "visite", etichetta: "Visite Fatte" },
    { chiave: "caldi", etichetta: "Clienti Caldi" },
    { chiave: "contratti", etichetta: "Contratti Chiusi" }
  ];

  // Calcola Mappa
  const mappa = {};
  database.forEach((r) => {
    const v = r.venditore;
    const d = r.data;
    if (!mappa[v]) {
      mappa[v] = {};
      parametri.forEach((p) => {
        mappa[v][p.chiave] = {};
      });
    }
    parametri.forEach((p) => {
      if (!mappa[v][p.chiave][d]) mappa[v][p.chiave][d] = 0;
      let val = 0;
      if (p.chiave === "lead") val = r.lead;
      else if (p.chiave === "appuntamenti") val = r.appuntamenti;
      else if (p.chiave === "giacenze") val = r.giacenze;
      else if (p.chiave === "agenda") val = r.agenda;
      else if (p.chiave === "visite") val = r.visite;
      else if (p.chiave === "caldi") val = r.caldi;
      else if (p.chiave === "contratti") val = r.contratti;
      mappa[v][p.chiave][d] += val;
    });
  });

  // Genera Header
  const table = document.getElementById("table-foglio4");
  let theadHTML = `
    <tr>
      <th style="min-width: 130px;">Venditore</th>
      <th style="min-width: 150px;">Parametro</th>
      <th>Totale</th>
      ${dateCol.map((d) => `<th>${formattaDataPerTabellaVisiva(d)}</th>`).join("")}
    </tr>
  `;
  table.querySelector("thead").innerHTML = theadHTML;

  // Genera Body
  let tbodyHTML = "";
  if (venditoriCompleti.length === 0) {
    tbodyHTML = `<tr><td colspan="${dateCol.length + 3}" style="text-align: center; padding: 20px;">Nessun venditore registrato.</td></tr>`;
  } else {
    venditoriCompleti.forEach((v) => {
      tbodyHTML += `
        <tr>
          <td style="vertical-align: middle; font-weight: bold;">${v}</td>
          <td colspan="${dateCol.length + 2}" style="padding: 0;">
            <table style="width: 100%; border-collapse: collapse; border: none;">
              <tbody>
                ${parametri.map((p) => {
                  const totale = dateCol.reduce((s, d) => s + (mappa[v]?.[p.chiave]?.[d] || 0), 0);
                  return `
                    <tr style="border-bottom: 1px solid #cbd5e1;">
                      <td style="width: 150px; text-align: left; font-weight: 500; border: none; padding: 10px;">${p.etichetta}</td>
                      <td style="width: 100px; border: none; padding: 10px;"><strong>${totale}</strong></td>
                      ${dateCol.map((d) => `
                        <td style="border: none; padding: 10px;">${mappa[v]?.[p.chiave]?.[d] || 0}</td>
                      `).join("")}
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </td>
        </tr>
      `;
    });
  }
  table.querySelector("tbody").innerHTML = tbodyHTML;
}

// ─── RENDERING FOGLIO 6 (VISTA GIORNO) ────────────────────────────────────
function renderFoglio6() {
  const f6Data = document.getElementById("f6-data").value;
  const venditoriCompleti = getListaVenditoriCompleta();

  const parametri = [
    { chiave: "lead", etichetta: "Lead Ricevuti" },
    { chiave: "appuntamenti", etichetta: "App.ti Presi" },
    { chiave: "giacenze", etichetta: "Giacenze" },
    { chiave: "agenda", etichetta: "In Agenda" },
    { chiave: "visite", etichetta: "Visite Fatte" },
    { chiave: "caldi", etichetta: "Clienti Caldi" },
    { chiave: "contratti", etichetta: "Contratti Chiusi" },
    { chiave: "reattivo", etichetta: "Stato" },
    { chiave: "oversell", etichetta: "Oversell" },
    { chiave: "soprPen", etichetta: "% Sopr Pen." },
    { chiave: "vendPen", etichetta: "% Vend Pen." },
    { chiave: "prevConc", etichetta: "Prev. Conc." },
    { chiave: "nomiCaldi", etichetta: "Nomi Caldi" },
    { chiave: "contrEntrati", etichetta: "Contr. Entrati" },
    { chiave: "note", etichetta: "Note" }
  ];

  // Calcola dati del giorno specifico
  const righeGiorno = database.filter((r) => r.data === f6Data);
  const mappa = {};
  righeGiorno.forEach((r) => {
    const v = r.venditore;
    if (!mappa[v]) {
      mappa[v] = {
        lead: 0, appuntamenti: 0, giacenze: 0, agenda: 0, visite: 0, caldi: 0,
        contratti: 0, reattivo: "", oversell: "", soprPen: 0, vendPen: 0,
        prevConc: [], nomiCaldi: [], contrEntrati: [], note: []
      };
    }
    mappa[v].lead += r.lead;
    mappa[v].appuntamenti += r.appuntamenti;
    mappa[v].giacenze += r.giacenze;
    mappa[v].agenda += r.agenda;
    mappa[v].visite += r.visite;
    mappa[v].caldi += r.caldi;
    mappa[v].contratti += r.contratti;
    mappa[v].soprPen = r.soprPen;
    mappa[v].vendPen = r.vendPen;
    if (r.reattivo) mappa[v].reattivo = r.reattivo;
    if (r.oversell) mappa[v].oversell = r.oversell;
    if (r.prevConc) mappa[v].prevConc.push(r.prevConc);
    if (r.nomiCaldi) mappa[v].nomiCaldi.push(r.nomiCaldi);
    if (r.contrEntrati) mappa[v].contrEntrati.push(r.contrEntrati);
    if (r.note) mappa[v].note.push(r.note);
  });

  // Genera Header
  const table = document.getElementById("table-foglio6");
  let theadHTML = `
    <tr>
      <th>Venditore</th>
      ${parametri.map((p) => `<th>${p.etichetta}</th>`).join("")}
    </tr>
  `;
  table.querySelector("thead").innerHTML = theadHTML;

  // Genera Body
  let tbodyHTML = "";
  if (venditoriCompleti.length === 0) {
    tbodyHTML = `<tr><td colspan="${parametri.length + 1}" style="text-align: center; padding: 20px;">Nessun agente registrato.</td></tr>`;
  } else {
    venditoriCompleti.forEach((v) => {
      const rigaDb = mappa[v];
      tbodyHTML += `
        <tr>
          <td><strong>${v}</strong></td>
          ${parametri.map((p) => {
            let val = rigaDb ? (rigaDb[p.chiave] !== undefined ? rigaDb[p.chiave] : "") : "";
            if (Array.isArray(val)) val = val.join(" | ");
            if ((p.chiave === "soprPen" || p.chiave === "vendPen") && rigaDb) {
              val = val + "%";
            }
            return `<td>${val}</td>`;
          }).join("")}
        </tr>
      `;
    });
  }
  table.querySelector("tbody").innerHTML = tbodyHTML;
}

// ─── RENDERING FOGLIO 8 (CHIAMATE GIORNO) ─────────────────────────────────
function renderFoglio8() {
  let f8Data = document.getElementById("f8-data").value;
  if (!f8Data) {
    f8Data = oggiISO();
    document.getElementById("f8-data").value = f8Data;
  }

  const recordsFiltrati = database
    .filter((r) => r.dataChiamata === f8Data)
    .sort((a, b) => a.venditore.localeCompare(b.venditore));

  const tbody = document.querySelector("#table-foglio8 tbody");
  tbody.innerHTML = "";

  if (recordsFiltrati.length === 0) {
    tbody.innerHTML = `<tr><td colSpan="12" style="text-align: center; padding: 20px;">Nessuna chiamata registrata in questa data.</td></tr>`;
    return;
  }

  recordsFiltrati.forEach((r) => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${r.venditore}</strong></td>
        <td>${formattaDataPerTabellaVisiva(r.dataInserimento)}</td>
        <td>${r.lead}</td>
        <td>${r.appuntamenti}</td>
        <td>${r.giacenze}</td>
        <td>${r.agenda}</td>
        <td>${r.visite}</td>
        <td>${r.caldi}</td>
        <td>${r.contratti}</td>
        <td>${r.reattivo}</td>
        <td>${r.nomiCaldi}</td>
        <td>${r.note}</td>
      </tr>
    `;
  });
}

// ─── RENDERING FOGLIO 7 (VISTA AGENTE) ────────────────────────────────────
function renderFoglio7() {
  const f7Venditore = document.getElementById("f7-venditore").value;
  const f7Inizio = document.getElementById("f7-inizio").value;
  const f7Fine = document.getElementById("f7-fine").value;

  const dateCol = generaListaDatePeriodo(f7Inizio, f7Fine);
  const table = document.getElementById("table-foglio7");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  if (!f7Venditore) {
    thead.innerHTML = `<tr><th>Seleziona un agente dal menu in alto</th></tr>`;
    tbody.innerHTML = `<tr><td style="text-align: center; padding: 20px;">Seleziona un agente per visualizzare le performance.</td></tr>`;
    return;
  }

  if (dateCol.length === 0) {
    thead.innerHTML = `<tr><th>Parametro</th><th>Nessun giorno selezionato</th></tr>`;
    tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 20px;">Nessun giorno presente nel periodo selezionato.</td></tr>`;
    return;
  }

  // Genera Header
  let theadHTML = `
    <tr>
      <th>Parametro</th>
      <th>Totale</th>
      ${dateCol.map((d) => `<th>${formattaDataPerTabellaVisiva(d)}</th>`).join("")}
    </tr>
  `;
  thead.innerHTML = theadHTML;

  // Calcola Mappa
  const parametri = [
    { chiave: "lead", etichetta: "Lead Ricevuti" },
    { chiave: "appuntamenti", etichetta: "App.ti Presi" },
    { chiave: "giacenze", etichetta: "Giacenze" },
    { chiave: "agenda", etichetta: "In Agenda" },
    { chiave: "visite", etichetta: "Visite Fatte" },
    { chiave: "caldi", etichetta: "Clienti Caldi" },
    { chiave: "contratti", etichetta: "Contratti Chiusi" }
  ];

  const mappa = {};
  database
    .filter((r) => r.venditore === nomeNormalizzato(f7Venditore))
    .forEach((r) => {
      const d = r.data;
      if (!mappa[d]) mappa[d] = {};
      parametri.forEach((p) => {
        if (!mappa[d][p.chiave]) mappa[d][p.chiave] = 0;
        let val = 0;
        if (p.chiave === "lead") val = r.lead;
        else if (p.chiave === "appuntamenti") val = r.appuntamenti;
        else if (p.chiave === "giacenze") val = r.giacenze;
        else if (p.chiave === "agenda") val = r.agenda;
        else if (p.chiave === "visite") val = r.visite;
        else if (p.chiave === "caldi") val = r.caldi;
        else if (p.chiave === "contratti") val = r.contratti;
        mappa[d][p.chiave] += val;
      });
    });

  // Genera Body
  let tbodyHTML = "";
  parametri.forEach((p) => {
    const totale = dateCol.reduce((somma, d) => somma + (mappa[d]?.[p.chiave] || 0), 0);
    tbodyHTML += `
      <tr>
        <td><strong>${p.etichetta}</strong></td>
        <td><strong>${totale}</strong></td>
        ${dateCol.map((d) => `<td>${mappa[d]?.[p.chiave] || 0}</td>`).join("")}
      </tr>
    `;
  });
  tbody.innerHTML = tbodyHTML;
}

// ─── RENDERING FOGLIO 9 (ALERT CONTATTI AGENTI) ───────────────────────────
function renderFoglio9() {
  const oggi = oggiISO();
  const ultimaChiamata = {};
  
  database.forEach((r) => {
    if (!r.dataChiamata) return;
    const v = r.venditore;
    if (!ultimaChiamata[v] || r.dataChiamata > ultimaChiamata[v]) {
      ultimaChiamata[v] = r.dataChiamata;
    }
  });

  const rossi = [];
  const arancioni = [];
  const verdi = [];

  const venditoriCompleti = getListaVenditoriCompleta();
  venditoriCompleti.forEach((v) => {
    const ultima = ultimaChiamata[v] || null;
    const giorni = ultima ? giorniTraDate(ultima, oggi) : null;
    const voce = { venditore: v, ultima, giorni };

    if (giorni === null || giorni >= 8) {
      rossi.push(voce);
    } else if (giorni >= 4) {
      arancioni.push(voce);
    } else {
      verdi.push(voce);
    }
  });

  // Ordina per ritardo decrescente
  const ordina = (arr) => arr.sort((a, b) => (b.giorni ?? 9999) - (a.giorni ?? 9999));
  ordina(rossi);
  ordina(arancioni);
  ordina(verdi);

  // Aggiorna Contatori
  document.getElementById("alert-count-rossi").innerText = `${rossi.length} agenti`;
  document.getElementById("alert-count-arancioni").innerText = `${arancioni.length} agenti`;
  document.getElementById("alert-count-verdi").innerText = `${verdi.length} agenti`;

  // Renderizza Rossi
  const bodyRossi = document.getElementById("alert-body-rossi");
  bodyRossi.innerHTML = "";
  if (rossi.length === 0) {
    bodyRossi.innerHTML = `<div class="alert-empty">Nessun agente in questa fascia.</div>`;
  } else {
    rossi.forEach((v) => {
      bodyRossi.innerHTML += `
        <div class="alert-item">
          <span class="alert-nome">${v.venditore}</span>
          <span class="alert-dettaglio">
            ${v.ultima ? `Ultima chiamata: ${formattaDataPerTabellaVisiva(v.ultima)} · ${v.giorni} giorni fa` : "Mai contattato"}
          </span>
        </div>
      `;
    });
  }

  // Renderizza Arancioni
  const bodyArancioni = document.getElementById("alert-body-arancioni");
  bodyArancioni.innerHTML = "";
  if (arancioni.length === 0) {
    bodyArancioni.innerHTML = `<div class="alert-empty">Nessun agente in questa fascia.</div>`;
  } else {
    arancioni.forEach((v) => {
      bodyArancioni.innerHTML += `
        <div class="alert-item">
          <span class="alert-nome">${v.venditore}</span>
          <span class="alert-dettaglio">
            ${v.ultima ? `Ultima chiamata: ${formattaDataPerTabellaVisiva(v.ultima)} · ${v.giorni} giorni fa` : "Mai contattato"}
          </span>
        </div>
      `;
    });
  }

  // Renderizza Verdi
  const bodyVerdi = document.getElementById("alert-body-verdi");
  bodyVerdi.innerHTML = "";
  if (verdi.length === 0) {
    bodyVerdi.innerHTML = `<div class="alert-empty">Nessun agente in questa fascia.</div>`;
  } else {
    verdi.forEach((v) => {
      bodyVerdi.innerHTML += `
        <div class="alert-item">
          <span class="alert-nome">${v.venditore}</span>
          <span class="alert-dettaglio">
            ${v.ultima ? `Ultima chiamata: ${formattaDataPerTabellaVisiva(v.ultima)} · ${v.giorni} giorni fa` : "Mai contattato"}
          </span>
        </div>
      `;
    });
  }
}

// ─── RENDERING FOGLIO 5 (DATABASE GENERALE) ───────────────────────────────
function renderFoglio5() {
  const tbody = document.querySelector("#table-database tbody");
  tbody.innerHTML = "";

  if (database.length === 0) {
    tbody.innerHTML = `<tr><td colSpan="21" style="text-align: center; padding: 20px;">Nessun record nel Cloud.</td></tr>`;
    return;
  }

  database.forEach((r, idx) => {
    const rigaPrecedente = idx > 0 ? database[idx - 1] : null;
    const isBreak = rigaPrecedente && rigaPrecedente.venditore !== r.venditore;
    const breakClass = isBreak ? 'class="venditore-break"' : '';

    const tr = document.createElement("tr");
    if (breakClass) tr.className = "venditore-break";

    tr.innerHTML = `
      <td>${formattaDataPerTabellaVisiva(r.dataInserimento)}</td>
      <td>${r.venditore}</td>
      <td>${r.lead}</td>
      <td>${r.appuntamenti}</td>
      <td>${r.giacenze}</td>
      <td>${r.agenda}</td>
      <td>${r.visite}</td>
      <td>${r.caldi}</td>
      <td>${r.contratti}</td>
      <td>${r.reattivo}</td>
      <td>${r.oversell}</td>
      <td>${r.soprPen}%</td>
      <td>${r.vendPen}%</td>
      <td>${r.prevConc}</td>
      <td>${r.nomiCaldi}</td>
      <td>${r.contrEntrati}</td>
      <td>${r.note}</td>
      <td>${formattaDataPerTabellaVisiva(r.dataRiferimento)}</td>
      <td>${formattaDataPerTabellaVisiva(r.dataChiamata)}</td>
      <td>${formattaDataPerTabellaVisiva(r.dataModifica)}</td>
      <td style="text-align: center; white-space: nowrap;">
        <button class="btn-modifica">✏️ Modifica</button>
        <button class="btn-elimina">❌ Elimina</button>
      </td>
    `;

    // Aggiungi click event ai pulsanti riga
    tr.querySelector(".btn-modifica").addEventListener("click", () => apriModifica(r.id));
    tr.querySelector(".btn-elimina").addEventListener("click", () => eliminaRecord(r.id));

    tbody.appendChild(tr);
  });
}
