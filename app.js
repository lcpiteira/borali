(function () {
    'use strict';

    // === Firebase Config ===
    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyB7vpMV8uhGA6qde51wq4qr4biivi2QWJI",
        authDomain: "boraali-87a41.firebaseapp.com",
        databaseURL: "https://boraali-87a41-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "boraali-87a41",
        storageBucket: "boraali-87a41.firebasestorage.app",
        messagingSenderId: "341111325815",
        appId: "1:341111325815:web:82bc34398134d13030b272"
    };

    // === State ===
    let db = null;
    let auth = null;
    let currentUser = null;
    let currentGroupId = null;
    let userGroups = {};
    let listeners = [];

    // === DOM Elements ===
    const loadingScreen = document.getElementById('loadingScreen');
    const loginScreen = document.getElementById('loginScreen');
    const groupsScreen = document.getElementById('groupsScreen');
    const listScreen = document.getElementById('listScreen');
    const googleLoginBtn = document.getElementById('googleLogin');
    const logoutBtnGroups = document.getElementById('logoutBtnGroups');
    const userNameGroupsEl = document.getElementById('userNameGroups');
    const groupsListEl = document.getElementById('groupsList');
    const newGroupNameEl = document.getElementById('newGroupName');
    const createGroupBtn = document.getElementById('createGroupBtn');
    const joinCodeEl = document.getElementById('joinCode');
    const joinGroupBtn = document.getElementById('joinGroupBtn');
    const backToGroupsBtn = document.getElementById('backToGroups');
    const groupTitleEl = document.getElementById('groupTitle');
    const groupInfoBtn = document.getElementById('groupInfoBtn');
    const itemNameEl = document.getElementById('itemName');
    const itemQtyEl = document.getElementById('itemQty');
    const itemUnitEl = document.getElementById('itemUnit');
    const addItemBtn = document.getElementById('addItemBtn');
    const pendingItemsEl = document.getElementById('pendingItems');
    const checkedItemsEl = document.getElementById('checkedItems');
    const pendingCountEl = document.getElementById('pendingCount');
    const checkedCountEl = document.getElementById('checkedCount');
    const clearCheckedBtn = document.getElementById('clearCheckedBtn');
    const groupInfoModal = document.getElementById('groupInfoModal');
    const closeModalBtn = document.getElementById('closeModal');
    const editItemModal = document.getElementById('editItemModal');
    const closeEditModalBtn = document.getElementById('closeEditModal');
    const editItemNameEl = document.getElementById('editItemName');
    const editItemQtyEl = document.getElementById('editItemQty');
    const editItemUnitEl = document.getElementById('editItemUnit');
    const saveEditBtn = document.getElementById('saveEditBtn');
    let editingItemId = null;
    const modalGroupNameEl = document.getElementById('modalGroupName');
    const groupCodeEl = document.getElementById('groupCode');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const shareCodeBtn = document.getElementById('shareCodeBtn');
    const membersListEl = document.getElementById('membersList');
    const masterSectionEl = document.getElementById('masterSection');
    const leaveSectionEl = document.getElementById('leaveSection');
    const deleteGroupBtn = document.getElementById('deleteGroupBtn');
    const leaveGroupBtn = document.getElementById('leaveGroupBtn');
    const toastEl = document.getElementById('toast');

    // === Init ===
    initFirebase();
    bindEvents();

    function initFirebase() {
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.database();
        auth = firebase.auth();

        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        auth.getRedirectResult().then(function (result) {
            if (result.user) {
                console.log('Redirect login:', result.user.email);
            }
        }).catch(function (err) {
            console.error('Redirect error:', err);
        });

        auth.onAuthStateChanged(function (user) {
            if (user) {
                currentUser = user;
                saveUserProfile(user);
                showGroups();
            } else {
                currentUser = null;
                showScreen('login');
            }
        });
    }

    function bindEvents() {
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
        logoutBtnGroups.addEventListener('click', handleLogout);
        createGroupBtn.addEventListener('click', handleCreateGroup);
        joinGroupBtn.addEventListener('click', handleJoinGroup);
        backToGroupsBtn.addEventListener('click', function () {
            detachListeners();
            currentGroupId = null;
            showGroups();
        });
        addItemBtn.addEventListener('click', handleAddItem);
        itemNameEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleAddItem();
        });
        groupInfoBtn.addEventListener('click', showGroupInfo);
        closeModalBtn.addEventListener('click', hideGroupInfo);
        groupInfoModal.addEventListener('click', function (e) {
            if (e.target === groupInfoModal) hideGroupInfo();
        });
        copyCodeBtn.addEventListener('click', handleCopyCode);
        shareCodeBtn.addEventListener('click', handleShareCode);
        deleteGroupBtn.addEventListener('click', handleDeleteGroup);
        leaveGroupBtn.addEventListener('click', handleLeaveGroup);
        clearCheckedBtn.addEventListener('click', handleClearChecked);
        closeEditModalBtn.addEventListener('click', closeEditModal);
        editItemModal.addEventListener('click', function (e) {
            if (e.target === editItemModal) closeEditModal();
        });
        saveEditBtn.addEventListener('click', handleSaveEdit);
        editItemNameEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleSaveEdit();
        });
        editItemQtyEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleSaveEdit();
        });
        editItemUnitEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleSaveEdit();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && editItemModal.style.display !== 'none') closeEditModal();
        });
    }

    // === Auth ===
    function handleGoogleLogin() {
        var provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(function (err) {
            if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
                showToast('Popup bloqueado, a tentar redirect...');
                auth.signInWithRedirect(provider);
            } else {
                showToast('Erro: ' + err.message);
            }
        });
    }

    function handleLogout() {
        detachListeners();
        auth.signOut();
    }

    function saveUserProfile(user) {
        db.ref('users/' + user.uid).update({
            name: user.displayName || 'Utilizador',
            email: user.email || '',
            photoURL: user.photoURL || ''
        });
    }

    // === Navigation ===
    function showScreen(screen) {
        loadingScreen.style.display = 'none';
        loginScreen.style.display = 'none';
        groupsScreen.style.display = 'none';
        listScreen.style.display = 'none';

        switch (screen) {
            case 'loading': loadingScreen.style.display = ''; break;
            case 'login': loginScreen.style.display = ''; break;
            case 'groups': groupsScreen.style.display = ''; break;
            case 'list': listScreen.style.display = ''; break;
        }
    }

    // === Groups Screen ===
    function showGroups() {
        showScreen('groups');
        userNameGroupsEl.textContent = shortName(currentUser.displayName) || currentUser.email;
        loadUserGroups();

        // Auto-fill code from URL param (e.g. ?code=ABC123)
        var params = new URLSearchParams(window.location.search);
        var codeParam = params.get('code');
        if (codeParam) {
            joinCodeEl.value = codeParam.toUpperCase();
            window.history.replaceState({}, '', window.location.pathname);
        }
    }

    function loadUserGroups() {
        var ref = db.ref('users/' + currentUser.uid + '/groups');
        ref.on('value', function (snap) {
            userGroups = snap.val() || {};
            renderGroups();
        });
    }

    function renderGroups() {
        var ids = Object.keys(userGroups);
        if (ids.length === 0) {
            groupsListEl.innerHTML = '<div class="empty-state"><div class="emoji">🏖️</div><p>Ainda não tens grupos.<br>Cria um ou junta-te com um código!</p></div>';
            return;
        }

        groupsListEl.innerHTML = '';
        var loaded = 0;
        ids.forEach(function (gid) {
            db.ref('groups/' + gid).once('value', function (snap) {
                loaded++;
                var g = snap.val();
                if (!g) {
                    // Group was deleted, clean up
                    db.ref('users/' + currentUser.uid + '/groups/' + gid).remove();
                    if (loaded === ids.length) finalizeGroupsRender();
                    return;
                }
                var isMaster = g.master === currentUser.uid;
                var memberCount = g.members ? Object.keys(g.members).length : 0;
                var itemCount = g.items ? Object.keys(g.items).length : 0;

                var card = document.createElement('div');
                card.className = 'group-card';
                card.innerHTML =
                    '<span class="group-emoji">🛒</span>' +
                    '<div class="group-info">' +
                    '<h3>' + escapeHtml(g.name) + '</h3>' +
                    '<span class="group-meta">' + memberCount + ' membro' + (memberCount !== 1 ? 's' : '') + ' • ' + itemCount + ' artigo' + (itemCount !== 1 ? 's' : '') + '</span>' +
                    '</div>' +
                    (isMaster ? '<span class="group-badge">Admin</span>' : '');
                card.addEventListener('click', function () {
                    openGroup(gid, g);
                });
                groupsListEl.appendChild(card);

                if (loaded === ids.length) finalizeGroupsRender();
            });
        });
    }

    function finalizeGroupsRender() {
        // Groups all rendered
    }

    function handleCreateGroup() {
        var name = newGroupNameEl.value.trim();
        if (!name) {
            showToast('Dá um nome ao grupo');
            return;
        }

        var code = generateCode();
        var groupRef = db.ref('groups').push();
        var gid = groupRef.key;

        var groupData = {
            name: name,
            code: code,
            master: currentUser.uid,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            members: {}
        };
        groupData.members[currentUser.uid] = {
            name: currentUser.displayName || 'Utilizador',
            email: currentUser.email || '',
            photoURL: currentUser.photoURL || '',
            joinedAt: firebase.database.ServerValue.TIMESTAMP
        };

        var updates = {};
        updates['groups/' + gid] = groupData;
        updates['users/' + currentUser.uid + '/groups/' + gid] = true;
        updates['codes/' + code] = gid;

        db.ref().update(updates).then(function () {
            newGroupNameEl.value = '';
            showToast('Grupo "' + name + '" criado! Código: ' + code);
        }).catch(function (err) {
            showToast('Erro: ' + err.message);
        });
    }

    function handleJoinGroup() {
        var code = joinCodeEl.value.trim().toUpperCase();
        if (!code || code.length < 4) {
            showToast('Introduz um código válido');
            return;
        }

        db.ref('codes/' + code).once('value', function (snap) {
            var gid = snap.val();
            if (!gid) {
                showToast('Código inválido');
                return;
            }

            // Check if already member
            db.ref('groups/' + gid + '/members/' + currentUser.uid).once('value', function (memberSnap) {
                if (memberSnap.exists()) {
                    showToast('Já fazes parte deste grupo!');
                    joinCodeEl.value = '';
                    return;
                }

                var updates = {};
                updates['groups/' + gid + '/members/' + currentUser.uid] = {
                    name: currentUser.displayName || 'Utilizador',
                    email: currentUser.email || '',
                    photoURL: currentUser.photoURL || '',
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                };
                updates['users/' + currentUser.uid + '/groups/' + gid] = true;

                db.ref().update(updates).then(function () {
                    joinCodeEl.value = '';
                    showToast('Juntaste-te ao grupo! 🎉');
                }).catch(function (err) {
                    showToast('Erro: ' + err.message);
                });
            });
        });
    }

    function generateCode() {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var code = '';
        for (var i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // === Shopping List Screen ===
    function openGroup(gid, groupData) {
        currentGroupId = gid;
        groupTitleEl.textContent = groupData.name;
        showScreen('list');
        attachItemsListener(gid);
    }

    function attachItemsListener(gid) {
        detachListeners();
        var ref = db.ref('groups/' + gid + '/items');
        var listener = ref.on('value', function (snap) {
            renderItems(snap.val() || {});
        });
        listeners.push({ ref: ref, event: 'value', fn: listener });
    }

    function detachListeners() {
        listeners.forEach(function (l) {
            l.ref.off(l.event, l.fn);
        });
        listeners = [];
    }

    function renderItems(items) {
        var pending = [];
        var checked = [];

        Object.keys(items).forEach(function (id) {
            var item = items[id];
            item._id = id;
            if (item.checked) {
                checked.push(item);
            } else {
                pending.push(item);
            }
        });

        // Sort: newest first for pending, most recently checked first for checked
        pending.sort(function (a, b) { return (b.addedAt || 0) - (a.addedAt || 0); });
        checked.sort(function (a, b) { return (b.checkedAt || 0) - (a.checkedAt || 0); });

        pendingCountEl.textContent = pending.length;
        checkedCountEl.textContent = checked.length;
        clearCheckedBtn.style.display = checked.length > 0 ? '' : 'none';

        pendingItemsEl.innerHTML = pending.length === 0
            ? '<div class="empty-state"><div class="emoji">✨</div><p>Lista vazia! Adiciona artigos acima.</p></div>'
            : '';

        pending.forEach(function (item) {
            pendingItemsEl.appendChild(createItemCard(item, false));
        });

        checkedItemsEl.innerHTML = '';
        checked.forEach(function (item) {
            checkedItemsEl.appendChild(createItemCard(item, true));
        });
    }

    function createItemCard(item, isChecked) {
        var card = document.createElement('div');
        card.className = 'item-card' + (isChecked ? ' checked' : '');

        var qtyText = item.quantity ? item.quantity + (item.unit ? ' ' + item.unit : '') : '';
        var addedByText = shortName(item.addedByName) || 'Alguém';
        var timeText = item.addedAt ? timeAgo(item.addedAt) : '';

        card.innerHTML =
            '<div class="item-check ' + (isChecked ? 'is-checked' : '') + '" data-id="' + item._id + '">' +
            (isChecked ? '✓' : '') + '</div>' +
            '<div class="item-details">' +
            '<div class="item-name">' + escapeHtml(item.name) + '</div>' +
            '<div class="item-meta">' + escapeHtml(addedByText) + (timeText ? ' • ' + timeText : '') + '</div>' +
            '</div>' +
            (qtyText ? '<span class="item-qty">' + escapeHtml(qtyText) + '</span>' : '') +
            '<button class="item-edit" data-id="' + item._id + '" title="Editar">✏️</button>' +
            '<button class="item-delete" data-id="' + item._id + '" title="Apagar">🗑️</button>';

        card.querySelector('.item-check').addEventListener('click', function () {
            toggleItemCheck(item._id, !isChecked);
        });

        card.querySelector('.item-edit').addEventListener('click', function () {
            openEditModal(item);
        });

        card.querySelector('.item-delete').addEventListener('click', function () {
            deleteItem(item._id);
        });

        return card;
    }

    function handleAddItem() {
        var name = itemNameEl.value.trim();
        if (!name) {
            showToast('Escreve o nome do artigo');
            itemNameEl.focus();
            return;
        }

        var qty = parseInt(itemQtyEl.value) || 1;
        var unit = itemUnitEl.value.trim() || '';

        var itemData = {
            name: name,
            quantity: qty,
            unit: unit,
            addedBy: currentUser.uid,
            addedByName: currentUser.displayName || 'Utilizador',
            addedAt: firebase.database.ServerValue.TIMESTAMP,
            checked: false,
            checkedBy: null,
            checkedAt: null
        };

        db.ref('groups/' + currentGroupId + '/items').push(itemData).then(function () {
            itemNameEl.value = '';
            itemQtyEl.value = '1';
            itemUnitEl.value = '';
            itemNameEl.focus();
        }).catch(function (err) {
            showToast('Erro: ' + err.message);
        });
    }

    function toggleItemCheck(itemId, checked) {
        var updates = {
            checked: checked,
            checkedBy: checked ? currentUser.uid : null,
            checkedByName: checked ? (currentUser.displayName || 'Utilizador') : null,
            checkedAt: checked ? firebase.database.ServerValue.TIMESTAMP : null
        };
        db.ref('groups/' + currentGroupId + '/items/' + itemId).update(updates);
    }

    function deleteItem(itemId) {
        db.ref('groups/' + currentGroupId + '/items/' + itemId).remove();
    }

    function openEditModal(item) {
        editingItemId = item._id;
        editItemNameEl.value = item.name || '';
        editItemQtyEl.value = item.quantity || 1;
        editItemUnitEl.value = item.unit || '';
        editItemModal.style.display = 'flex';
        setTimeout(function () { editItemNameEl.focus(); editItemNameEl.select(); }, 50);
    }

    function closeEditModal() {
        editItemModal.style.display = 'none';
        editingItemId = null;
    }

    function handleSaveEdit() {
        if (!editingItemId || !currentGroupId) return;

        var name = editItemNameEl.value.trim();
        if (!name) {
            showToast('Escreve o nome do artigo');
            editItemNameEl.focus();
            return;
        }

        var qty = Math.max(1, parseInt(editItemQtyEl.value) || 1);
        var unit = editItemUnitEl.value.trim() || '';
        var itemId = editingItemId;
        var ref = db.ref('groups/' + currentGroupId + '/items/' + itemId);

        ref.once('value').then(function (snap) {
            if (!snap.exists()) {
                showToast('Este artigo já não existe');
                closeEditModal();
                return;
            }
            return ref.update({
                name: name,
                quantity: qty,
                unit: unit,
                editedBy: currentUser.uid,
                editedByName: currentUser.displayName || 'Utilizador',
                editedAt: firebase.database.ServerValue.TIMESTAMP
            }).then(function () {
                closeEditModal();
            });
        }).catch(function (err) {
            showToast('Erro: ' + err.message);
        });
    }

    function handleClearChecked() {
        if (!confirm('Limpar todos os itens comprados?')) return;
        db.ref('groups/' + currentGroupId + '/items').once('value', function (snap) {
            var items = snap.val() || {};
            var updates = {};
            Object.keys(items).forEach(function (id) {
                if (items[id].checked) {
                    updates[id] = null;
                }
            });
            if (Object.keys(updates).length > 0) {
                db.ref('groups/' + currentGroupId + '/items').update(updates);
                showToast('Itens comprados limpos ✨');
            }
        });
    }

    // === Group Info Modal ===
    function showGroupInfo() {
        groupInfoModal.style.display = '';
        db.ref('groups/' + currentGroupId).once('value', function (snap) {
            var g = snap.val();
            if (!g) return;

            modalGroupNameEl.textContent = g.name;
            groupCodeEl.textContent = g.code;

            var isMaster = g.master === currentUser.uid;
            masterSectionEl.style.display = isMaster ? '' : 'none';
            leaveSectionEl.style.display = isMaster ? 'none' : '';

            membersListEl.innerHTML = '';
            if (g.members) {
                Object.keys(g.members).forEach(function (uid) {
                    var m = g.members[uid];
                    var isOwner = uid === g.master;
                    var div = document.createElement('div');
                    div.className = 'member-item';
                    div.innerHTML =
                        (m.photoURL
                            ? '<img class="member-avatar" src="' + escapeHtml(m.photoURL) + '" alt="">'
                            : '<div class="member-avatar-placeholder">' + (m.name ? m.name.charAt(0).toUpperCase() : '?') + '</div>') +
                        '<div class="member-info">' +
                        '<div class="member-name">' + escapeHtml(shortName(m.name) || 'Utilizador') + '</div>' +
                        '<div class="member-role">' + (isOwner ? '👑 Administrador' : 'Membro') + '</div>' +
                        '</div>';
                    membersListEl.appendChild(div);
                });
            }
        });
    }

    function hideGroupInfo() {
        groupInfoModal.style.display = 'none';
    }

    function handleCopyCode() {
        var code = groupCodeEl.textContent;
        copyToClipboard(code);
        showToast('Código copiado: ' + code);
    }

    function handleShareCode() {
        var code = groupCodeEl.textContent;
        var groupName = modalGroupNameEl.textContent;
        var link = 'https://lcpiteira.github.io/borali/?code=' + code;
        var messages = [
            '🛒 Bora às compras! Junta-te ao grupo "' + groupName + '" no BoraAli!\n\n👉 ' + link + '\n\nSe não trouxeres o que está na lista, dormes no carro. 🚗',
            '🏖️ Férias a chegar e a lista de compras não se faz sozinha!\n\nEntra no grupo "' + groupName + '":\n👉 ' + link + '\n\nQuem não adicionar nada, fica a comer tostas com ar. 🍞💨',
            '📢 ALERTA DE COMPRAS!\n\nO grupo "' + groupName + '" precisa de ti!\n👉 ' + link + '\n\nNão sejas o amigo que aparece só com gelo e guardanapos. 🧊',
            '🛒 Atenção equipa!\n\nA lista de compras para "' + groupName + '" está a precisar do teu talento:\n👉 ' + link + '\n\nRegra: quem não mete na lista, não come. Simples. 😤🍽️'
        ];
        var msg = messages[Math.floor(Math.random() * messages.length)];

        if (navigator.share) {
            navigator.share({ text: msg }).catch(function () {
                copyToClipboard(msg);
                showToast('Mensagem copiada! Cola e envia 📤');
            });
        } else {
            copyToClipboard(msg);
            showToast('Mensagem copiada! Cola e envia 📤');
        }
    }

    function copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
        } else {
            var ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    }

    function handleDeleteGroup() {
        if (!confirm('Tens a certeza que queres eliminar este grupo? Esta ação é irreversível.')) return;

        db.ref('groups/' + currentGroupId).once('value', function (snap) {
            var g = snap.val();
            if (!g || g.master !== currentUser.uid) {
                showToast('Apenas o admin pode eliminar o grupo');
                return;
            }

            var updates = {};
            updates['groups/' + currentGroupId] = null;
            updates['codes/' + g.code] = null;

            // Remove group from all members
            if (g.members) {
                Object.keys(g.members).forEach(function (uid) {
                    updates['users/' + uid + '/groups/' + currentGroupId] = null;
                });
            }

            db.ref().update(updates).then(function () {
                hideGroupInfo();
                detachListeners();
                currentGroupId = null;
                showGroups();
                showToast('Grupo eliminado');
            });
        });
    }

    function handleLeaveGroup() {
        if (!confirm('Tens a certeza que queres sair deste grupo?')) return;

        var updates = {};
        updates['groups/' + currentGroupId + '/members/' + currentUser.uid] = null;
        updates['users/' + currentUser.uid + '/groups/' + currentGroupId] = null;

        db.ref().update(updates).then(function () {
            hideGroupInfo();
            detachListeners();
            currentGroupId = null;
            showGroups();
            showToast('Saíste do grupo');
        });
    }

    // === Utilities ===
    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(function () {
            toastEl.classList.remove('show');
        }, 3000);
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function shortName(name) {
        if (!name) return '';
        var parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0];
        var last = parts[parts.length - 1];
        return parts[0] + ' ' + last.charAt(0).toUpperCase() + '.';
    }

    function timeAgo(timestamp) {
        var now = Date.now();
        var diff = now - timestamp;
        var mins = Math.floor(diff / 60000);
        if (mins < 1) return 'agora';
        if (mins < 60) return mins + ' min';
        var hours = Math.floor(mins / 60);
        if (hours < 24) return hours + 'h';
        var days = Math.floor(hours / 24);
        return days + 'd';
    }
})();
