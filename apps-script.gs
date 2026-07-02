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

function doGet(e) {
  var action = e.parameter.action;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Foglio1");
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Foglio 'Foglio1' non trovato nel Google Sheet." }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "getDati") {
    var range = sheet.getDataRange();
    var values = range.getValues();
    var displayValues = range.getDisplayValues(); // Ottiene i valori visualizzati (utile per preservare il formato delle date stringa)
    var data = [];
    
    // L'intestazione è alla riga 0. I dati veri e propri partono dalla riga 1.
    for (var i = 1; i < values.length; i++) {
      var rowVal = values[i];
      var rowDisp = displayValues[i];
      if (!rowVal[0]) continue; // Salta righe vuote senza ID
      
      data.push({
        id: rowVal[0],
        venditore: rowVal[1] ? rowVal[1].toString().trim().toUpperCase() : "",
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
    
    return ContentService.createTextOutput(JSON.stringify(data))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "getAgenti") {
    var agenti = [];
    
    // Prova a recuperare la lista dal foglio di configurazione "Agenti" se presente
    var agentiSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Agenti");
    if (agentiSheet) {
      var aValues = agentiSheet.getDataRange().getValues();
      for (var j = 1; j < aValues.length; j++) {
        var nome = aValues[j][0];
        if (nome) {
          agenti.push(nome.toString().trim().toUpperCase());
        }
      }
    }
    
    // Estrae anche i venditori storici inseriti nel Foglio1 per non perdere nessuno
    var f1Values = sheet.getDataRange().getValues();
    for (var k = 1; k < f1Values.length; k++) {
      var vNome = f1Values[k][1]; // Colonna B (2) è il Venditore
      if (vNome) {
        vNome = vNome.toString().trim().toUpperCase();
        if (vNome && agenti.indexOf(vNome) === -1) {
          agenti.push(vNome);
        }
      }
    }
    
    // Ordina alfabeticamente
    agenti.sort();
    
    // Restituisce entrambi i formati di risposta per massima compatibilità con l'app
    return ContentService.createTextOutput(JSON.stringify({ venditori: agenti }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: "Azione non riconosciuta." }))
                       .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Foglio1");
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Foglio 'Foglio1' non trovato nel Google Sheet." }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  var postData = JSON.parse(e.postData.contents);
  var action = postData.action;
  var record = postData.record;
  
  if (action === "salva") {
    var id = record.id || new Date().getTime();
    var dataInserimento = record.dataInserimento || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    var dataChiamata = record.dataChiamata || dataInserimento;
    var dataModifica = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    var dataRiferimento = record.dataRiferimento || dataInserimento;
    
    sheet.appendRow([
      id,
      record.venditore ? record.venditore.toString().trim().toUpperCase() : "",
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
      record.venditore ? record.venditore.toString().trim().toUpperCase() : "",
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
