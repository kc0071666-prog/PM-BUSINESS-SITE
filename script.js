const SUPABASE_URL = "https://jchxvkrgqntkjdfwcidn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjaHh2a3JncW50a2pkZndjaWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMjA0NTksImV4cCI6MjEwMjU5NjQ1OX0.E21zodQvz-2zQbegwEnfMZgVb18ycYTAgQO510P_Hq4";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let categories = ["Vêtements Femme","Vêtements Homme","Vêtements Enfant","Pantalon","Chemise","Boucles d'oreilles","Bague","Chaînette","Chaussures","Babouche","Chapeau"];
let fournisseurConnecteID = null;

async function showPage(id, el){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const searchBar = document.getElementById('search-bar');
    if(id === 'articles'){ searchBar.classList.add('show'); } 
    else { searchBar.classList.remove('show'); }
    document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('footer div').forEach(b=>b.classList.remove('active'));
    if(el) el.classList.add('active');
    if(id==='categories') loadCategories();
    if(id==='articles') loadArticles();
    if(id==='fournisseurs') loadFournisseurs();
}

// ARTICLES AVEC PANIER 🛒
async function loadArticles(){
    let grid = document.getElementById('articles-grid'); 
    grid.innerHTML='<p style="text-align:center;width:100%;">Chargement...</p>';
    const { data: articles } = await _supabase.from('articles').select('*').order('created_at', {ascending: false});
    grid.innerHTML='';
    if(articles) {
        articles.forEach((a)=>{
            grid.innerHTML += `
            <div class="card" onclick="openPopup('${a.nom.replace(/'/g, "\\'")}','${a.prix}','${a.image_url}')">
                <img src="${a.image_url || ''}">
                <h4>${a.nom}</h4>
                <div class="price-container">
                    <p>${a.prix}</p>
                    <span class="btn-panier" onclick="event.stopPropagation(); showPage('message', document.querySelectorAll('footer div')[1])">🛒</span>
                </div>
            </div>`
        });
    }
}

function openPopup(nom, prix, img){
    document.getElementById('popup').classList.add('active');
    document.getElementById('popup-content').innerHTML = `<span class="close" onclick="closePopup()">×</span><img src="${img}" style="width:100%; height:250px; border-radius:10px; object-fit: contain; margin-bottom:15px;"><h2>${nom}</h2><h3 style="color:var(--rouge); font-size:1.5rem;">${prix}</h3><button style="margin-top:20px;" onclick="closePopup()">Fermer</button>`;
}

function closePopup(){
    document.getElementById('popup').classList.remove('active'); 
    if(window.chatInterval) clearInterval(window.chatInterval);
}

// INSCRIPTION (SÉCURISÉE SANS TEL/EMAIL)
async function inscription(){
    const photoFile = document.getElementById('fourni-photo').files[0];
    const nom = document.getElementById('nom').value;
    const pays = document.getElementById('pays').value;
    const code = document.getElementById('code_secret').value;
    const btn = document.querySelector('.popup-content button[onclick="inscription()"]');

    if(!nom || !code || !photoFile){ alert("Veuillez remplir le nom, le code secret et choisir une photo."); return; }
    btn.innerText = "Patientez..."; btn.disabled = true;

    try {
        const { data: countData } = await _supabase.from('fournisseurs').select('id');
        if(countData && countData.length >= 3){ alert("Limite de 3 fournisseurs atteinte."); return; }

        const fileName = "fourni_" + Date.now() + "_" + photoFile.name;
        await _supabase.storage.from('images').upload(fileName, photoFile);
        const { data: urlData } = _supabase.storage.from('images').getPublicUrl(fileName);

        const { data: result, error: insertError } = await _supabase.from('fournisseurs').insert([{ 
            nom, pays, photo_url: urlData.publicUrl, code_secret: code 
        }]).select();
        
        if(!insertError) { 
            localStorage.setItem('mon_id_fournisseur', result[0].id);
            alert("Inscription réussie ! Retenez bien votre code secret."); 
            closeForm(); loadFournisseurs(); 
        }
    } catch (err) { alert("Erreur : " + err.message); } 
    finally { btn.innerText = "Valider"; btn.disabled = false; }
}

async function loadFournisseurs(){
    let list = document.getElementById('liste-fournisseurs'); list.innerHTML='';
    const { data } = await _supabase.from('fournisseurs').select('*');
    let btnInscrire = document.querySelector('.btn-inscrire');
    if (data && data.length >= 3) { if (btnInscrire) btnInscrire.style.setProperty('display', 'none', 'important'); }
    list.innerHTML='';
    if(data) {
        data.forEach((f)=>{
            list.innerHTML += `<div class="fournisseur" onclick="dashboardFournisseur('${f.id}', '${f.nom.replace(/'/g, "\\'")}')"><img src="${f.photo_url || ''}" style="width:65px; height:65px; border-radius:50%; object-fit:cover; border:3px solid var(--jaune);"><div><h3>${f.nom}</h3><p>Vendeur PM Business</p></div></div>`
        })
    }
}

async function dashboardFournisseur(id, nom){
    let monId = localStorage.getItem('mon_id_fournisseur');
    document.getElementById('popup').classList.add('active');
    if(monId === id) {
        fournisseurConnecteID = id;
        document.getElementById('popup-content').innerHTML = `<span class="close" onclick="closePopup()">×</span><h3>Bonjour ${nom}</h3><button onclick="openFormArticle()">+ Publier un Article</button><h4 style="margin-top:20px;">Messages reçus</h4><div id="client-list">Chargement...</div>`;
        const { data: msgs } = await _supabase.from('messages').select('nom_client').eq('fournisseur_id', id);
        let clientsUnique = [...new Set(msgs?.map(m => m.nom_client))];
        let listDiv = document.getElementById('client-list');
        listDiv.innerHTML = (clientsUnique.length === 0) ? "Aucun message" : "";
        clientsUnique.forEach(client => { listDiv.innerHTML += `<div class="msg-client" style="cursor:pointer; margin-top:10px;" onclick="openChatRoom('${id}', '${client}', 'fournisseur')">Discussion avec ${client}</div>`; });
    } else {
        document.getElementById('popup-content').innerHTML = `<span class="close" onclick="closePopup()">×</span><h3>Vendeur : ${nom}</h3><p style="margin:20px 0;">Discutez avec ce vendeur pour passer commande.</p><button onclick="demanderNomClient('${id}', '${nom}')">💬 Lui envoyer un message</button><hr style="margin:20px 0; opacity:0.1;"><button style="background:#777; font-size:11px; padding:8px;" onclick="connexionFournisseur('${id}', '${nom}')">Accès Propriétaire</button>`;
    }
}

// CONNEXION PAR CODE SECRET
async function connexionFournisseur(id, nom){
    document.getElementById('popup-content').innerHTML = `
        <span class="close" onclick="closePopup()">×</span>
        <h3>Connexion ${nom}</h3>
        <input type="password" id="confirm-code" placeholder="Entrez votre code secret">
        <button onclick="verifierConnexion('${id}')">Confirmer</button>`;
}

async function verifierConnexion(id){
    let code = document.getElementById('confirm-code').value;
    const { data: f } = await _supabase.from('fournisseurs').select('*').eq('id', id).single();
    if(f && f.code_secret === code){ 
        localStorage.setItem('mon_id_fournisseur', id); 
        alert("Connecté !"); dashboardFournisseur(id, f.nom); 
    } else { alert("Code incorrect."); }
}

function openFormArticle(){
    let options = categories.map(c=>`<option>${c}</option>`).join('');
    document.getElementById('popup-content').innerHTML = `<span class="close" onclick="closePopup()">×</span><h3>Publier</h3><input type="text" id="art-nom" placeholder="Nom"><input type="text" id="art-prix" placeholder="Prix"><select id="art-cat">${options}</select><input type="file" id="art-file" accept="image/*"><button id="btn-publier" onclick="publierArticle()">Mettre en ligne</button>`;
}

async function publierArticle(){
    const file = document.getElementById('art-file').files[0];
    if(!file) return;
    const fileName = Date.now() + "_" + file.name;
    await _supabase.storage.from('images').upload(fileName, file);
    const { data: urlData } = _supabase.storage.from('images').getPublicUrl(fileName);
    await _supabase.from('articles').insert([{ nom: document.getElementById('art-nom').value, prix: document.getElementById('art-prix').value, categorie: document.getElementById('art-cat').value, image_url: urlData.publicUrl, fournisseur_id: fournisseurConnecteID }]);
    alert("Publié !"); closePopup(); loadArticles();
}

async function openChatList(event){
    if(event) event.preventDefault();
    document.getElementById('popup').classList.add('active');
    document.getElementById('popup-content').innerHTML = "<h3>Chargement...</h3>";
    const { data } = await _supabase.from('fournisseurs').select('*');
    let html = '<span class="close" onclick="closePopup()">×</span><h3>Choisir un vendeur</h3>';
    if(data && data.length > 0) { 
        data.forEach((f)=>{ html += `<div class="fournisseur" onclick="demanderNomClient('${f.id}', '${f.nom.replace(/'/g, "\\'")}')"><img src="${f.photo_url || ''}" style="width:50px; height:50px; border-radius:50%; object-fit:cover;"><div><h3>${f.nom}</h3></div></div>`; }); 
    } else { html += "<p>Aucun fournisseur disponible.</p>"; }
    document.getElementById('popup-content').innerHTML = html;
}

function demanderNomClient(fId, fNom){
    document.getElementById('popup-content').innerHTML = `
        <span class="close" onclick="closePopup()">×</span>
        <h3>Votre Nom</h3>
        <input type="text" id="client-pseudo" placeholder="Votre nom">
        <button onclick="lancerChat('${fId}')">Commencer</button>`;
}

function lancerChat(fId){
    let nomC = document.getElementById('client-pseudo').value;
    if(nomC) openChatRoom(fId, nomC, 'client');
}

// RECHERCHE
document.querySelector('#search-bar input').addEventListener('input', (e) => {
    let searchVal = e.target.value.toLowerCase();
    let allCards = document.querySelectorAll('.card');
    allCards.forEach(card => {
        let productName = card.querySelector('h4').innerText.toLowerCase();
        card.style.display = productName.includes(searchVal) ? "block" : "none";
    });
});

function loadCategories(){
    let side = document.getElementById('sidebar-cat'); 
    side.innerHTML='<div onclick="filterCat(\'TOUT\',this)" class="active">TOUT</div>';
    categories.forEach((c)=>{ side.innerHTML += `<div onclick="filterCat('${c}',this)">${c}</div>`; });
    filterCat("TOUT", side.children[0]);
}

async function filterCat(cat, el){
    document.querySelectorAll('.sidebar div').forEach(d=>d.classList.remove('active'));
    if(el) el.classList.add('active');
    let grid = document.getElementById('cat-products'); grid.innerHTML='Chargement...';
    let query = _supabase.from('articles').select('*');
    if(cat !== "TOUT") query = query.eq('categorie', cat);
    const { data: filtered } = await query;
    grid.innerHTML='';
    if(filtered) { 
        filtered.forEach(a=>{ 
            grid.innerHTML += `<div class="card" onclick="openPopup('${a.nom.replace(/'/g, "\\'")}','${a.prix}','${a.image_url}')"><img src="${a.image_url}"><h4>${a.nom}</h4><div class="price-container"><p>${a.prix}</p><span class="btn-panier" onclick="event.stopPropagation(); showPage('message', document.querySelectorAll('footer div')[1])">🛒</span></div></div>` 
        }); 
    }
}

async function openChatRoom(fId, clientNom, role){
    fournisseurConnecteID = fId;
    let expediteurNom = (role === 'client') ? clientNom : "Fournisseur";
    document.getElementById('popup-content').innerHTML = `<span class="close" onclick="closePopup()">×</span><h3 style="margin-bottom:10px;">Chat</h3><div id="chat-box" class="msg-container" style="height:300px; overflow-y:auto;"></div><div class="chat-input-area"><input type="text" id="msg-input" placeholder="Message..."><button onclick="envoyerMessage('${clientNom}', '${expediteurNom}')">➤</button></div>`;
    loadMessages(fId, clientNom);
    if(window.chatInterval) clearInterval(window.chatInterval);
    window.chatInterval = setInterval(() => loadMessages(fId, clientNom), 3000);
}
async function envoyerMessage(clientNom, expediteur){
    let txt = document.getElementById('msg-input').value;
    if(!txt) return;
    await _supabase.from('messages').insert([{ fournisseur_id: fournisseurConnecteID, nom_client: clientNom, expediteur: expediteur, contenu: txt }]);
    document.getElementById('msg-input').value = ""; loadMessages(fournisseurConnecteID, clientNom);
}
async function loadMessages(fId, clientNom){
    const { data } = await _supabase.from('messages').select('*').eq('fournisseur_id', fId).eq('nom_client', clientNom).order('created_at', { ascending: true });
    let box = document.getElementById('chat-box');
    if(box && data){ box.innerHTML = data.map(m => `<div class="msg-bubble ${m.expediteur !== "Fournisseur" ? 'msg-client' : 'msg-fournisseur'}"><span class="msg-name">${m.expediteur}</span>${m.contenu}</div>`).join(''); box.scrollTop = box.scrollHeight; }
}

function openForm(){document.getElementById('form-popup').classList.add('active');}
function closeForm(){document.getElementById('form-popup').classList.remove('active');}
loadArticles();
