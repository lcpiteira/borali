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

    // === Categories ===
    const CATEGORIES = [
        { key: 'frutas',     label: 'Frutas e Vegetais', emoji: '🥦' },
        { key: 'lacticinios', label: 'Lacticínios',       emoji: '🥛' },
        { key: 'padaria',    label: 'Padaria',           emoji: '🍞' },
        { key: 'carne',      label: 'Carne e Peixe',     emoji: '🥩' },
        { key: 'mercearia',  label: 'Mercearia',         emoji: '🥫' },
        { key: 'bebidas',    label: 'Bebidas',           emoji: '🥤' },
        { key: 'higiene',    label: 'Higiene',           emoji: '🧴' },
        { key: 'limpeza',    label: 'Limpeza',           emoji: '🧼' },
        { key: 'congelados', label: 'Congelados',        emoji: '🥶' },
        { key: 'outros',     label: 'Outros',            emoji: '📦' }
    ];
    const CATEGORY_BY_KEY = CATEGORIES.reduce(function (acc, c) { acc[c.key] = c; return acc; }, {});
    function getCategory(key) { return CATEGORY_BY_KEY[key] || CATEGORY_BY_KEY.outros; }

    // === State ===
    let db = null;
    let auth = null;
    let currentUser = null;
    let currentGroupId = null;
    let currentGroupName = null;
    let userGroups = {};
    let currentRun = null;
    let currentItems = {};
    let currentMembers = {};
    let viewMode = 'mine'; // 'all' | 'mine' (only when run is active)
    let listeners = [];
    const GEMINI_MODEL = 'gemini-2.5-flash';
    let geminiApiKey = null;

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
    const itemCategoryEl = document.getElementById('itemCategory');
    const addItemBtn = document.getElementById('addItemBtn');
    const pendingItemsEl = document.getElementById('pendingItems');
    const checkedItemsEl = document.getElementById('checkedItems');
    const pendingCountEl = document.getElementById('pendingCount');
    const checkedCountEl = document.getElementById('checkedCount');
    const clearCheckedBtn = document.getElementById('clearCheckedBtn');
    const runBarEl = document.getElementById('runBar');
    const distributeModal = document.getElementById('distributeModal');
    const closeDistributeModalBtn = document.getElementById('closeDistributeModal');
    const shoppersListEl = document.getElementById('shoppersList');
    const assignmentsListEl = document.getElementById('assignmentsList');
    const startRunBtn = document.getElementById('startRunBtn');
    let distributeShoppers = []; // uids selected in distribute modal
    let distributeAssignments = {}; // cat -> uid
    const groupInfoModal = document.getElementById('groupInfoModal');
    const closeModalBtn = document.getElementById('closeModal');
    const editItemModal = document.getElementById('editItemModal');
    const closeEditModalBtn = document.getElementById('closeEditModal');
    const editItemNameEl = document.getElementById('editItemName');
    const editItemQtyEl = document.getElementById('editItemQty');
    const editItemUnitEl = document.getElementById('editItemUnit');
    const editItemCategoryEl = document.getElementById('editItemCategory');
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

    // === AI DOM ===
    const aiFabEl = document.getElementById('aiFab');
    const aiDrawerEl = document.getElementById('aiDrawer');
    const aiDrawerCloseBtn = document.getElementById('aiDrawerClose');
    const aiMessagesEl = document.getElementById('aiMessages');
    const aiInputEl = document.getElementById('aiInput');
    const aiSendBtn = document.getElementById('aiSendBtn');

    // === Init ===
    populateCategorySelects();
    initFirebase();
    bindEvents();

    function populateCategorySelects() {
        var html = CATEGORIES.map(function (c) {
            return '<option value="' + c.key + '">' + c.emoji + ' ' + c.label + '</option>';
        }).join('');
        itemCategoryEl.innerHTML = html;
        itemCategoryEl.value = 'outros';
        editItemCategoryEl.innerHTML = html;
    }

    function initFirebase() {
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.database();
        auth = firebase.auth();

        // Load Gemini API key
        db.ref('config/geminiApiKey').once('value', function (snap) {
            geminiApiKey = snap.val() || null;
        });

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
            currentGroupName = null;
            aiFabEl.style.display = 'none';
            closeAiDrawer();
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
            if (e.key === 'Escape' && distributeModal.style.display !== 'none') closeDistributeModal();
        });
        closeDistributeModalBtn.addEventListener('click', closeDistributeModal);
        distributeModal.addEventListener('click', function (e) {
            if (e.target === distributeModal) closeDistributeModal();
        });
        startRunBtn.addEventListener('click', handleStartRun);
        runBarEl.addEventListener('click', handleRunBarClick);

        // AI events
        aiFabEl.addEventListener('click', openAiDrawer);
        aiDrawerCloseBtn.addEventListener('click', closeAiDrawer);
        aiSendBtn.addEventListener('click', handleAiSend);
        aiInputEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleAiSend();
        });
        document.addEventListener('click', function (e) {
            if (aiDrawerEl.style.display !== 'none' &&
                !aiDrawerEl.contains(e.target) &&
                e.target !== aiFabEl) {
                closeAiDrawer();
            }
        });
        document.querySelectorAll('.ai-quick-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var prompt = btn.getAttribute('data-prompt');
                if (prompt) askGemini(prompt);
            });
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
        currentGroupName = groupData.name;
        currentItems = {};
        currentRun = null;
        currentMembers = {};
        viewMode = 'mine';
        groupTitleEl.textContent = groupData.name;
        showScreen('list');
        attachGroupListeners(gid);
        aiFabEl.style.display = '';
    }

    function attachGroupListeners(gid) {
        detachListeners();
        attachListener(db.ref('groups/' + gid + '/items'), function (snap) {
            currentItems = snap.val() || {};
            render();
            maybeAutoEndRun();
        });
        attachListener(db.ref('groups/' + gid + '/shoppingRun'), function (snap) {
            var prevRun = currentRun;
            currentRun = snap.val() || null;
            if (!prevRun && currentRun) viewMode = userIsShopper() ? 'mine' : 'all';
            if (prevRun && !currentRun) viewMode = 'mine';
            render();
            maybeAutoEndRun();
        });
        attachListener(db.ref('groups/' + gid + '/members'), function (snap) {
            currentMembers = snap.val() || {};
            render();
        });
    }

    function attachListener(ref, cb) {
        var listener = ref.on('value', cb);
        listeners.push({ ref: ref, event: 'value', fn: listener });
    }

    function detachListeners() {
        listeners.forEach(function (l) {
            l.ref.off(l.event, l.fn);
        });
        listeners = [];
    }

    function getItemAssignee(item) {
        if (!currentRun || !currentRun.assignments) return null;
        var catKey = getCategory(item.category).key;
        return currentRun.assignments[catKey] || null;
    }

    function getMemberName(uid) {
        var m = currentMembers[uid];
        return m ? m.name : 'Alguém';
    }

    function userIsShopper() {
        if (!currentRun || !currentRun.assignments) return false;
        var keys = Object.keys(currentRun.assignments);
        for (var i = 0; i < keys.length; i++) {
            if (currentRun.assignments[keys[i]] === currentUser.uid) return true;
        }
        return false;
    }

    function render() {
        var pending = [];
        var checked = [];

        Object.keys(currentItems).forEach(function (id) {
            var item = currentItems[id];
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

        renderRunBar(pending);

        // Apply view filter when run is active and viewMode === 'mine'
        var pendingFiltered = pending;
        if (currentRun && viewMode === 'mine') {
            pendingFiltered = pending.filter(function (it) { return getItemAssignee(it) === currentUser.uid; });
        }

        pendingCountEl.textContent = pendingFiltered.length;
        checkedCountEl.textContent = checked.length;
        clearCheckedBtn.style.display = checked.length > 0 ? '' : 'none';

        pendingItemsEl.innerHTML = pendingFiltered.length === 0
            ? '<div class="empty-state"><div class="emoji">✨</div><p>' + (currentRun && viewMode === 'mine' ? 'Nada para ti aqui — boa!' : 'Lista vazia! Adiciona artigos abaixo.') + '</p></div>'
            : '';

        pendingFiltered.forEach(function (item) {
            pendingItemsEl.appendChild(createItemCard(item, false));
        });

        checkedItemsEl.innerHTML = '';
        checked.forEach(function (item) {
            checkedItemsEl.appendChild(createItemCard(item, true));
        });
    }

    function createItemCard(item, isChecked) {
        var card = document.createElement('div');
        var cat = getCategory(item.category);
        var assigneeUid = getItemAssignee(item);
        var isMine = currentRun && assigneeUid === currentUser.uid;
        var isOthers = currentRun && assigneeUid && !isMine;

        card.className = 'item-card' + (isChecked ? ' checked' : '') + (isOthers ? ' not-mine' : '') + (isMine ? ' mine' : '');

        var qtyText = item.quantity ? item.quantity + (item.unit ? ' ' + item.unit : '') : '';
        var addedByText = shortName(item.addedByName) || 'Alguém';
        var timeText = item.addedAt ? timeAgo(item.addedAt) : '';
        var assigneeName = currentRun && assigneeUid ? shortName(getMemberName(assigneeUid)) : '';
        var metaText = addedByText + (timeText ? ' • ' + timeText : '');
        if (assigneeName && !isMine) metaText = '👉 ' + assigneeName + ' • ' + metaText;

        card.innerHTML =
            '<div class="item-check ' + (isChecked ? 'is-checked' : '') + '" data-id="' + item._id + '" title="' + cat.label + '">' +
            (isChecked ? '✓' : '<span class="item-cat-emoji">' + cat.emoji + '</span>') + '</div>' +
            '<div class="item-details">' +
            '<div class="item-name">' + escapeHtml(item.name) + '</div>' +
            '<div class="item-meta">' + escapeHtml(metaText) + '</div>' +
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
        var category = itemCategoryEl.value || 'outros';

        var itemData = {
            name: name,
            quantity: qty,
            unit: unit,
            category: category,
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
            itemCategoryEl.value = 'outros';
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
        editItemCategoryEl.value = getCategory(item.category).key;
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
                category: editItemCategoryEl.value || 'outros',
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

    // === Shopping Run ===
    function renderRunBar(pendingItems) {
        if (!currentRun) {
            if (pendingItems.length === 0) {
                runBarEl.innerHTML = '';
                runBarEl.style.display = 'none';
                return;
            }
            runBarEl.style.display = '';
            runBarEl.innerHTML = '<button class="btn-distribute" data-action="open-distribute">🛒 Distribuir tarefas</button>';
            return;
        }
        // Run active — show tabs + terminar
        var mineCount = pendingItems.filter(function (it) { return getItemAssignee(it) === currentUser.uid; }).length;
        var allCount = pendingItems.length;
        runBarEl.style.display = '';
        runBarEl.innerHTML =
            '<div class="run-tabs">' +
            '<button class="run-tab ' + (viewMode === 'mine' ? 'active' : '') + '" data-action="view-mine">As minhas (' + mineCount + ')</button>' +
            '<button class="run-tab ' + (viewMode === 'all' ? 'active' : '') + '" data-action="view-all">Todas (' + allCount + ')</button>' +
            '</div>' +
            '<button class="btn-end-run" data-action="end-run">Terminar</button>';
    }

    function handleRunBarClick(e) {
        var action = e.target.getAttribute('data-action');
        if (!action) return;
        if (action === 'open-distribute') openDistributeModal();
        else if (action === 'view-mine') { viewMode = 'mine'; render(); }
        else if (action === 'view-all')  { viewMode = 'all';  render(); }
        else if (action === 'end-run')   handleEndRun();
    }

    function openDistributeModal() {
        // Default shoppers: current user only
        distributeShoppers = [currentUser.uid];
        distributeAssignments = {};
        autoDistribute();
        renderDistributeModal();
        distributeModal.style.display = 'flex';
    }

    function closeDistributeModal() {
        distributeModal.style.display = 'none';
    }

    function autoDistribute() {
        // Categories with pending items
        var pendingItems = Object.keys(currentItems)
            .map(function (id) { return currentItems[id]; })
            .filter(function (it) { return !it.checked; });
        var cats = {};
        pendingItems.forEach(function (it) {
            var k = getCategory(it.category).key;
            cats[k] = true;
        });
        var catKeys = Object.keys(cats);
        distributeAssignments = {};
        if (distributeShoppers.length === 0 || catKeys.length === 0) return;
        catKeys.forEach(function (k, i) {
            distributeAssignments[k] = distributeShoppers[i % distributeShoppers.length];
        });
    }

    function renderDistributeModal() {
        // Shoppers checkboxes (members of the group)
        var memberHtml = Object.keys(currentMembers).map(function (uid) {
            var m = currentMembers[uid];
            var checked = distributeShoppers.indexOf(uid) !== -1;
            var name = shortName(m.name) || 'Utilizador';
            return '<label class="shopper-row">' +
                '<input type="checkbox" data-uid="' + uid + '" ' + (checked ? 'checked' : '') + '>' +
                '<span>' + escapeHtml(name) + '</span>' +
                '</label>';
        }).join('');
        shoppersListEl.innerHTML = memberHtml || '<p class="info-note">Sem membros no grupo.</p>';

        shoppersListEl.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
            cb.addEventListener('change', function () {
                var uid = cb.getAttribute('data-uid');
                if (cb.checked) {
                    if (distributeShoppers.indexOf(uid) === -1) distributeShoppers.push(uid);
                } else {
                    distributeShoppers = distributeShoppers.filter(function (u) { return u !== uid; });
                }
                autoDistribute();
                renderDistributeModal();
            });
        });

        // Assignments per category (only categories with pending items)
        var pendingItems = Object.keys(currentItems)
            .map(function (id) { return currentItems[id]; })
            .filter(function (it) { return !it.checked; });
        var catKeys = {};
        pendingItems.forEach(function (it) { catKeys[getCategory(it.category).key] = true; });

        if (Object.keys(catKeys).length === 0) {
            assignmentsListEl.innerHTML = '<p class="info-note">Não há artigos pendentes para distribuir.</p>';
            startRunBtn.disabled = true;
            return;
        }
        startRunBtn.disabled = distributeShoppers.length === 0;

        var rows = CATEGORIES.filter(function (c) { return catKeys[c.key]; }).map(function (c) {
            var assigneeUid = distributeAssignments[c.key];
            var assigneeName = assigneeUid ? (shortName(getMemberName(assigneeUid)) || 'Utilizador') : '— (sem ninguém)';
            return '<div class="assignment-row">' +
                '<span class="assignment-cat">' + c.emoji + ' ' + c.label + '</span>' +
                '<button class="assignment-chip" data-cat="' + c.key + '">' + escapeHtml(assigneeName) + '</button>' +
                '</div>';
        }).join('');
        assignmentsListEl.innerHTML = rows;

        assignmentsListEl.querySelectorAll('.assignment-chip').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (distributeShoppers.length === 0) return;
                var cat = btn.getAttribute('data-cat');
                var current = distributeAssignments[cat];
                var idx = distributeShoppers.indexOf(current);
                var next = distributeShoppers[(idx + 1) % distributeShoppers.length];
                distributeAssignments[cat] = next;
                renderDistributeModal();
            });
        });
    }

    function handleStartRun() {
        if (distributeShoppers.length === 0) {
            showToast('Escolhe pelo menos uma pessoa');
            return;
        }
        if (Object.keys(distributeAssignments).length === 0) {
            showToast('Sem categorias para distribuir');
            return;
        }
        var run = {
            startedAt: firebase.database.ServerValue.TIMESTAMP,
            startedBy: currentUser.uid,
            startedByName: currentUser.displayName || 'Utilizador',
            assignments: distributeAssignments
        };
        db.ref('groups/' + currentGroupId + '/shoppingRun').set(run).then(function () {
            closeDistributeModal();
            showToast('Bora às compras! 🛒');
        }).catch(function (err) {
            showToast('Erro: ' + err.message);
        });
    }

    function handleEndRun() {
        db.ref('groups/' + currentGroupId + '/shoppingRun').remove();
    }

    function maybeAutoEndRun() {
        if (!currentRun) return;
        var pendingForRun = Object.keys(currentItems)
            .map(function (id) { return currentItems[id]; })
            .filter(function (it) { return !it.checked && getItemAssignee(it); });
        if (pendingForRun.length === 0) {
            db.ref('groups/' + currentGroupId + '/shoppingRun').remove();
            showToast('Compras concluídas! 🎉');
        }
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

    // === AI Chat (Gemini) ===
    function openAiDrawer() {
        aiDrawerEl.style.display = 'flex';
        aiFabEl.style.display = 'none';
        aiInputEl.focus();
    }

    function closeAiDrawer() {
        aiDrawerEl.style.display = 'none';
        if (currentGroupId) aiFabEl.style.display = '';
    }

    function handleAiSend() {
        var text = aiInputEl.value.trim();
        if (!text) return;
        aiInputEl.value = '';
        askGemini(text);
    }

    function buildShoppingContext() {
        var lines = [];
        lines.push('Grupo: ' + (currentGroupName || 'Sem nome'));
        lines.push('Data: ' + new Date().toLocaleDateString('pt-PT'));

        var pending = [], checked = [];
        Object.keys(currentItems).forEach(function (id) {
            var it = currentItems[id];
            var desc = it.name + (it.quantity ? ' (' + it.quantity + (it.unit ? ' ' + it.unit : '') + ')' : '') +
                       (it.category ? ' [' + getCategory(it.category).label + ']' : '') +
                       ' — adicionado por ' + (it.addedByName || 'alguém');
            if (it.checked) checked.push(desc); else pending.push(desc);
        });

        lines.push('Por comprar (' + pending.length + '): ' + (pending.length ? pending.join('; ') : 'nenhum'));
        lines.push('Já comprado (' + checked.length + '): ' + (checked.length ? checked.join('; ') : 'nenhum'));

        var memberNames = Object.values(currentMembers).map(function (m) { return m.name || 'Alguém'; });
        lines.push('Membros do grupo: ' + (memberNames.length ? memberNames.join(', ') : 'só tu'));
        return lines.join('\n');
    }

    var GEMINI_TOOLS = [{
        functionDeclarations: [
            {
                name: 'addItemToList',
                description: 'Adiciona um ou mais artigos à lista de compras do grupo.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        items: {
                            type: 'ARRAY',
                            description: 'Lista de artigos a adicionar',
                            items: {
                                type: 'OBJECT',
                                properties: {
                                    name:     { type: 'STRING',  description: 'Nome do artigo' },
                                    quantity: { type: 'NUMBER',  description: 'Quantidade (número)' },
                                    unit:     { type: 'STRING',  description: 'Unidade (ex: un, kg, L, pacote)' },
                                    category: { type: 'STRING',  description: 'Categoria: frutas, lacticinios, padaria, carne, mercearia, bebidas, higiene, limpeza, congelados, outros' }
                                },
                                required: ['name']
                            }
                        }
                    },
                    required: ['items']
                }
            },
            {
                name: 'getListSummary',
                description: 'Obtém um resumo actualizado da lista de compras.',
                parameters: { type: 'OBJECT', properties: {} }
            }
        ]
    }];

    function executeAiTool(name, args) {
        if (name === 'addItemToList') {
            var items = args.items || [];
            var added = [];
            items.forEach(function (it) {
                if (!it.name) return;
                var itemData = {
                    name: it.name,
                    quantity: it.quantity || 1,
                    unit: it.unit || '',
                    category: it.category || 'outros',
                    addedBy: currentUser.uid,
                    addedByName: currentUser.displayName || 'IA',
                    addedAt: firebase.database.ServerValue.TIMESTAMP,
                    checked: false,
                    checkedBy: null,
                    checkedAt: null
                };
                db.ref('groups/' + currentGroupId + '/items').push(itemData);
                added.push(it.name);
            });
            return { success: true, added: added, count: added.length };
        }
        if (name === 'getListSummary') {
            return { summary: buildShoppingContext() };
        }
        return { error: 'Ferramenta desconhecida: ' + name };
    }

    function addAiMessage(text, type) {
        // Remove loading bubble if present
        var loading = aiMessagesEl.querySelector('.loading');
        if (loading) loading.remove();

        var bubble = document.createElement('div');
        bubble.className = 'ai-bubble ' + type;
        bubble.textContent = text;
        aiMessagesEl.appendChild(bubble);
        aiMessagesEl.scrollTop = aiMessagesEl.scrollHeight;
        return bubble;
    }

    function addLoadingBubble() {
        var bubble = document.createElement('div');
        bubble.className = 'ai-bubble bot loading';
        aiMessagesEl.appendChild(bubble);
        aiMessagesEl.scrollTop = aiMessagesEl.scrollHeight;
    }

    function askGemini(userPrompt) {
        if (!geminiApiKey) {
            addAiMessage('⚠️ API key do Gemini não configurada. Vai ao Firebase Console → Realtime Database e adiciona o nó: config/geminiApiKey com a tua chave do Google AI Studio.', 'error');
            return;
        }

        addAiMessage(userPrompt, 'user');
        addLoadingBubble();
        aiSendBtn.disabled = true;
        aiInputEl.disabled = true;

        var context = buildShoppingContext();
        var systemPrompt =
            'És o assistente de compras do BoraAli, uma app cooperativa de listas de compras para férias. ' +
            'Respondes em português de Portugal (PT-PT). Sê conciso, prático e bem-disposto. ' +
            'Não uses markdown. Usa frases curtas e directas. ' +
            'Tens ferramentas para adicionar artigos à lista e consultar o estado actual. ' +
            'Quando o utilizador pedir sugestões, adiciona os artigos directamente com a ferramenta. ' +
            'Depois de adicionar, confirma o que fizeste de forma breve e divertida. ' +
            'Data de hoje: ' + new Date().toLocaleDateString('pt-PT');

        var fullPrompt = 'Contexto da lista:\n' + context + '\n\nPedido: ' + userPrompt;
        var conversationContents = [{ role: 'user', parts: [{ text: fullPrompt }] }];
        var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + geminiApiKey;

        function geminiRequest(contents) {
            return fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: contents,
                    tools: GEMINI_TOOLS,
                    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
                })
            }).then(function (res) {
                return res.json().then(function (data) {
                    if (!res.ok) throw new Error(data.error && data.error.message ? data.error.message : 'Erro ' + res.status);
                    return data;
                });
            });
        }

        function processResponse(data) {
            var candidate = data.candidates && data.candidates[0];
            if (!candidate || !candidate.content || !candidate.content.parts) {
                throw new Error('Resposta vazia do Gemini');
            }
            var parts = candidate.content.parts;
            var functionCalls = parts.filter(function (p) { return p.functionCall; });
            conversationContents.push({ role: 'model', parts: parts });

            if (functionCalls.length > 0) {
                var toolResults = functionCalls.map(function (p) {
                    var result = executeAiTool(p.functionCall.name, p.functionCall.args || {});
                    return { functionResponse: { name: p.functionCall.name, response: result } };
                });
                conversationContents.push({ role: 'function', parts: toolResults });
                return geminiRequest(conversationContents).then(processResponse);
            }

            var text = parts.filter(function (p) { return p.text; }).map(function (p) { return p.text; }).join('\n').trim();
            if (!text) throw new Error('Resposta vazia');
            return text;
        }

        geminiRequest(conversationContents)
            .then(processResponse)
            .then(function (text) { addAiMessage(text, 'bot'); })
            .catch(function (err) { addAiMessage('Erro: ' + err.message, 'error'); })
            .finally(function () {
                aiSendBtn.disabled = false;
                aiInputEl.disabled = false;
                aiInputEl.focus();
            });
    }
})();
