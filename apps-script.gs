/**
 * GOOGLE APPS SCRIPT - CODICE PER GESTIONE CRM SENZA COLONNA B
 * 
 * ISTRUZIONI DI INSTALLAZIONE:
 * 1. Apri il tuo Google Sheet.
 * 2. Clicca su "Estensioni" -> "Apps Script".
 * 3. Incolla questo codice all'interno dell'editor (sostituendo tutto il testo presente).
 * 4. Clicca sul pulsante "Salva" (icona del floppy).
 * 5. Clicca su "Distribuisci" -> "Nuova distribuzione".
 * 6. Seleziona tipo: "Applicazione web".
 * 7. Descrizione: "CRM API V2".
 * 8. Esegui come: "Tu" (la tua email).
 * 9. Chi ha accesso: "Chiunque" (fondamentale per permettere all'applicazione di comunicare).
 * 10. Clicca su "Distribuisci" e autorizza l'accesso con il tuo account Google.
 * 11. Copia l'URL dell'applicazione web generato e incollalo nella variabile GOOGLE_SCRIPT_URL in src/App.tsx.
 * 
 * IMPORTANTE: Nel tuo Google Sheet, il foglio principale deve chiamarsi esattamente "Foglio1"
 * e le colonne devono essere strutturate in questo preciso ordine (20 colonne totali, senza la colonna B precedente):
 * 
 * Colonna A (1):  ID
 * Colonna B (2):  Venditore
 * Colonna C (3):  Lead
 * Colonna D (4):  Appuntamenti
 * Colonna E (5):  Giacenze
 * Colonna F (6):  Agenda
 * Colonna G (7):  Visite
 * Colonna H (8):  Caldi
 * Colonna I (9):  Contratti
 * Colonna J (10): Reattivo
 * Colonna K (11): Oversell
 * Colonna L (12): SoprPen
 * Colonna M (13): VendPen
 * Colonna N (14): PrevConc
 * Colonna O (15): NomiCaldi
 * Colonna P (16): ContrEntrati
 * Colonna Q (17): Note
 * Colonna R (18): Data Inserimento
 * Colonna S (19): Data Chiamata
 * Colonna T (20): Data Modifica
 * Colonna U (21): Data Riferimento Dati
 */

// Cerca il foglio principale dei dati in modo dinamico e super robusto
function getFoglioDati() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Prova con "Foglio1" se ha righe di dati
  var sheet = ss.getSheetByName("Foglio1");
  if (sheet && sheet.getLastRow() > 1) {
    return sheet;
  }
  
  // 2. Prova con "DATABASE REPORT VENDITORI"
  sheet = ss.getSheetByName("DATABASE REPORT VENDITORI");
  if (sheet && sheet.getLastRow() > 1) {
    return sheet;
  }

  // 3. Cerca tra tutti i fogli se ce n'è uno che ha "Nome Venditore" o "Venditore" come intestazione
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    if (s.getName() === "Agenti") continue;
    if (s.getLastRow() > 0 && s.getLastColumn() > 1) {
      // Leggi la riga delle intestazioni (riga 1, colonne da A a E)
      var firstRow = s.getRange(1, 1, 1, Math.min(s.getLastColumn(), 5)).getValues()[0];
      for (var j = 0; j < firstRow.length; j++) {
        var val = firstRow[j].toString().toUpperCase();
        if (val.indexOf("VENDITORE") !== -1 || val.indexOf("AGENTE") !== -1) {
          return s;
        }
      }
    }
  }

  // 4. Se non trova nulla, prova il primo foglio che non sia "Agenti" e abbia almeno 2 righe
  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    if (s.getName() !== "Agenti" && s.getLastRow() > 1) {
      return s;
    }
  }
  
  // 5. Fallback assoluto
  return sheets[0];
}

function doGet(e) {
  var action = e.parameter.action;

  // ─── AZIONE DI DIAGNOSTICA ───────────────────────────────────────────────
  // Visita IL_TUO_URL/exec?action=debug nel browser per vedere esattamente
  // quale foglio sta usando il backend e cosa contiene.
  if (action === "debug") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dbgSheet = getFoglioDati();
    var info = {
      nomeFile: ss.getName(),
      foglioTrovatoDaBackend: dbgSheet ? dbgSheet.getName() : null,
      ultimaRiga: dbgSheet ? dbgSheet.getLastRow() : 0,
      ultimaColonna: dbgSheet ? dbgSheet.getLastColumn() : 0,
      intestazioniRiga1: dbgSheet && dbgSheet.getLastRow() > 0
        ? dbgSheet.getRange(1, 1, 1, Math.min(dbgSheet.getLastColumn(), 21)).getValues()[0]
        : [],
      tuttiIFogliDelloSpreadsheet: ss.getSheets().map(function (s) { return s.getName(); })
    };
    return ContentService.createTextOutput(JSON.stringify(info, null, 2))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = getFoglioDati();
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Foglio dati non trovato nel Google Sheet." }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "getDati") {
    var range = sheet.getDataRange();
    var values = range.getValues();
    var displayValues = range.getDisplayValues(); // Ottiene i valori visualizzati (utile per preservare il formato delle date stringa)
    var data = [];
    var sheetModified = false;
    
    // L'intestazione è alla riga 0. I dati veri e propri partono dalla riga 1.
    for (var i = 1; i < values.length; i++) {
      var rowVal = values[i];
      var rowDisp = displayValues[i];
      
      var venditoreRaw = rowVal[1] ? rowVal[1].toString().trim().toUpperCase() : "";
      // Se non c'è il venditore in colonna B, saltiamo la riga
      if (!venditoreRaw || venditoreRaw === "VENDITORE" || venditoreRaw === "NOME VENDITORE" || venditoreRaw === "UNDEFINED") {
        continue;
      }
      
      var id = rowVal[0];
      // Se l'ID in colonna A è vuoto, generiamo un ID univoco e lo scriviamo sul foglio
      if (!id || isNaN(Number(id))) {
        id = new Date().getTime() + i;
        sheet.getRange(i + 1, 1).setValue(id);
        rowVal[0] = id;
        sheetModified = true;
      }
      
      data.push({
        id: Number(id),
        venditore: venditoreRaw,
        lead: Number(rowVal[2]) || 0,
        appuntamenti: Number(rowVal[3]) || 0,
        giacenze: Number(rowVal[4]) || 0,
        agenda: Number(rowVal[5]) || 0,
        visite: Number(rowVal[6]) || 0,
        caldi: Number(rowVal[7]) || 0,
        contratti: Number(rowVal[8]) || 0,
        reattivo: rowVal[9] ? rowVal[9].toString().trim() : "REATTIVO",
        oversell: rowVal[10] ? rowVal[10].toString().trim() : "NO",
        soprPen: Number(rowVal[11]) || 0,
        vendPen: Number(rowVal[12]) || 0,
        prevConc: rowVal[13] ? rowVal[13].toString().trim() : "",
        nomiCaldi: rowVal[14] ? rowVal[14].toString().trim() : "",
        contrEntrati: rowVal[15] ? rowVal[15].toString().trim() : "",
        note: rowVal[16] ? rowVal[16].toString().trim() : "",
        dataInserimento: rowDisp[17] || "", // Preserviamo la stringa visualizzata della data
        dataChiamata: rowDisp[18] || "",
        dataModifica: rowDisp[19] || "",
        dataRiferimento: rowDisp[20] || ""
      });
    }
    
    if (sheetModified) {
      SpreadsheetApp.flush();
    }
    
    return ContentService.createTextOutput(JSON.stringify(data))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "getAgenti") {
    var agenti = [];
    var sheetAgenti = getFoglioDati();

    // Scansioniamo esclusivamente la colonna B (2a colonna) del foglio database
    if (sheetAgenti) {
      var lastRow = sheetAgenti.getLastRow();
      if (lastRow > 1) {
        var colValues = sheetAgenti.getRange(2, 2, lastRow - 1, 1).getValues();
        for (var r = 0; r < colValues.length; r++) {
          var valRaw = colValues[r][0];
          if (valRaw) {
            var val = valRaw.toString().trim().toUpperCase();
            // Escludiamo stringhe vuote, numeri ID, intestazioni o diciture generiche di sistema
            if (val &&
                isNaN(Number(val)) &&
                val !== "UNDEFINED" &&
                val !== "[OBJECT OBJECT]" &&
                val !== "VENDITORE" &&
                val !== "ID" &&
                val !== "NOME VENDITORE" &&
                val !== "NOME" &&
                val !== "AGENTE" &&
                val !== "NOME AGENTE" &&
                val.indexOf("TOTALE") === -1 &&
                val.indexOf("TOTAL") === -1) {
              // Deduplica: un nome ripetuto più volte viene restituito una sola volta
              if (agenti.indexOf(val) === -1) {
                agenti.push(val);
              }
            }
          }
        }
      }
    }

    // Ordiniamo alfabeticamente per eleganza d'uso
    agenti.sort();
    
    // Restituiamo sia l'array diretto sia la struttura { venditori: [...] } per garantire massima retrocompatibilità
    return ContentService.createTextOutput(JSON.stringify({ venditori: agenti }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: "Azione non riconosciuta." }))
                       .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = getFoglioDati();
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Foglio dati non trovato nel Google Sheet." }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  var postData = JSON.parse(e.postData.contents);
  var action = postData.action;
  var record = postData.record;
  
  if (action === "salva") {
    // Validazione: senza un venditore valido NON si scrive nessuna riga.
    // Questo impedisce in radice che finiscano nello sheet righe con colonne sballate.
    var venditoreSalva = record && record.venditore ? record.venditore.toString().trim().toUpperCase() : "";
    if (!venditoreSalva) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Campo Venditore obbligatorio: nessuna riga è stata scritta." }))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    // L'ID (colonna A) viene SEMPRE generato qui sul server, mai preso dal browser:
    // così è garantito che sia sempre un numero pulito e mai una data o altro valore.
    var id = new Date().getTime();
    var dataInserimento = record.dataInserimento || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    var dataChiamata = record.dataChiamata || dataInserimento;
    var dataModifica = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    var dataRiferimento = record.dataRiferimento || dataInserimento;
    
    sheet.appendRow([
      id,
      venditoreSalva,
      Number(record.lead) || 0,
      Number(record.appuntamenti) || 0,
      Number(record.giacenze) || 0,
      Number(record.agenda) || 0,
      Number(record.visite) || 0,
      Number(record.caldi) || 0,
      Number(record.contratti) || 0,
      record.reattivo || "REATTIVO",
      record.oversell || "NO",
      Number(record.soprPen) || 0,
      Number(record.vendPen) || 0,
      record.prevConc || "",
      record.nomiCaldi || "",
      record.contrEntrati || "",
      record.note || "",
      dataInserimento,
      dataChiamata,
      dataModifica,
      dataRiferimento
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, id: id }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "modifica") {
    var venditoreModifica = record && record.venditore ? record.venditore.toString().trim().toUpperCase() : "";
    if (!venditoreModifica) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Campo Venditore obbligatorio: la modifica non è stata salvata." }))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    var idToFind = Number(record.id);
    var values = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < values.length; i++) {
      if (Number(values[i][0]) === idToFind) {
        rowIndex = i + 1; // Le righe di Google Sheets sono 1-based
        break;
      }
    }
    
    if (rowIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Record non trovato nel database." }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    var dataModifica = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    
    // Aggiorna le 21 colonne della riga trovata
    sheet.getRange(rowIndex, 1, 1, 21).setValues([[
      idToFind,
      venditoreModifica,
      Number(record.lead) || 0,
      Number(record.appuntamenti) || 0,
      Number(record.giacenze) || 0,
      Number(record.agenda) || 0,
      Number(record.visite) || 0,
      Number(record.caldi) || 0,
      Number(record.contratti) || 0,
      record.reattivo || "REATTIVO",
      record.oversell || "NO",
      Number(record.soprPen) || 0,
      Number(record.vendPen) || 0,
      record.prevConc || "",
      record.nomiCaldi || "",
      record.contrEntrati || "",
      record.note || "",
      record.dataInserimento || "",
      record.dataChiamata || "",
      dataModifica,
      record.dataRiferimento || ""
    ]]);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "elimina") {
    var idToEliminate = Number(postData.id);
    var values = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < values.length; i++) {
      if (Number(values[i][0]) === idToEliminate) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Record non trovato." }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    sheet.deleteRow(rowIndex);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: "Operazione non supportata." }))
                       .setMimeType(ContentService.MimeType.JSON);
}
