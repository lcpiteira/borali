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

    // === Expenses DOM ===
    const tabNavEl = document.getElementById('tabNav');
    const viewListEl = document.getElementById('viewList');
    const viewExpensesEl = document.getElementById('viewExpenses');
    const addItemFormEl = document.getElementById('addItemForm');
    const addExpenseBarEl = document.getElementById('addExpenseBar');
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    const balanceSummaryEl = document.getElementById('balanceSummary');
    const expensesListEl = document.getElementById('expensesList');
    const expensesCountEl = document.getElementById('expensesCount');
    const expenseModal = document.getElementById('expenseModal');
    const expenseModalTitleEl = document.getElementById('expenseModalTitle');
    const closeExpenseModalBtn = document.getElementById('closeExpenseModal');
    const expenseDescriptionEl = document.getElementById('expenseDescription');
    const expenseAmountEl = document.getElementById('expenseAmount');
    const expenseCategoryEl = document.getElementById('expenseCategory');
    const expensePayerListEl = document.getElementById('expensePayerList');
    const expenseParticipantsListEl = document.getElementById('expenseParticipantsList');
    const expenseShareNoteEl = document.getElementById('expenseShareNote');
    const expenseSelectAllBtn = document.getElementById('expenseSelectAll');
    const saveExpenseBtn = document.getElementById('saveExpenseBtn');
    const deleteExpenseBtn = document.getElementById('deleteExpenseBtn');
    const settleModal = document.getElementById('settleModal');
    const closeSettleModalBtn = document.getElementById('closeSettleModal');
    const settleSummaryEl = document.getElementById('settleSummary');
    const settleAmountEl = document.getElementById('settleAmount');
    const confirmSettleBtn = document.getElementById('confirmSettleBtn');

    let activeTab = 'list'; // 'list' | 'expenses'
    let currentExpenses = {};
    let currentSettlements = {};
    let expenseEditingId = null;
    let expensePayer = null; // uid
    let expenseParticipants = []; // uid[]
    let settleContext = null; // { fromUid, toUid, suggestedCents }

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
        expenseCategoryEl.innerHTML = html;
    }

    // === Money helpers (store cents int, display EUR with comma) ===
    function parseAmountToCents(input) {
        if (!input) return NaN;
        var s = String(input).trim().replace(',', '.');
        if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
        var f = parseFloat(s);
        return Math.round(f * 100);
    }

    function formatCents(cents) {
        if (typeof cents !== 'number' || isNaN(cents)) return '0,00 €';
        var euros = Math.floor(Math.abs(cents) / 100);
        var rest = Math.abs(cents) % 100;
        var sign = cents < 0 ? '-' : '';
        return sign + euros + ',' + (rest < 10 ? '0' + rest : rest) + ' €';
    }

    function splitEqualCents(totalCents, n) {
        if (n <= 0) return [];
        var base = Math.floor(totalCents / n);
        var remainder = totalCents - base * n;
        var shares = [];
        for (var i = 0; i < n; i++) shares.push(base + (i < remainder ? 1 : 0));
        return shares;
    }

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
            if (err.code === 'auth/web-storage-unsupported' ||
                err.code === 'auth/operation-not-supported-in-this-environment') {
                document.getElementById('inappWarning').style.display = '';
                document.getElementById('googleLogin').style.display = 'none';
            } else {
                showToast('Erro ao entrar: ' + err.message);
            }
        });

        auth.onAuthStateChanged(function (user) {
            if (user) {
                currentUser = user;
                // Load Gemini API key now that user is authenticated
                db.ref('config/geminiApiKey').once('value', function (snap) {
                    geminiApiKey = snap.val() || null;
                });
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
        var openInSafariBtn = document.getElementById('openInSafariBtn');
        if (openInSafariBtn) {
            openInSafariBtn.addEventListener('click', function () {
                window.location.href = window.location.href;
            });
        }
        // Show in-app browser warning immediately on load if applicable
        if (isInAppBrowser()) {
            document.getElementById('inappWarning').style.display = '';
            googleLoginBtn.style.display = 'none';
        }
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
            if (e.key !== 'Escape') return;
            if (editItemModal.style.display !== 'none') closeEditModal();
            else if (distributeModal.style.display !== 'none') closeDistributeModal();
            else if (expenseModal.style.display !== 'none') closeExpenseModal();
            else if (settleModal.style.display !== 'none') closeSettleModal();
        });
        closeDistributeModalBtn.addEventListener('click', closeDistributeModal);
        distributeModal.addEventListener('click', function (e) {
            if (e.target === distributeModal) closeDistributeModal();
        });
        startRunBtn.addEventListener('click', handleStartRun);
        runBarEl.addEventListener('click', handleRunBarClick);

        // Expenses events
        tabNavEl.addEventListener('click', function (e) {
            var tab = e.target.getAttribute('data-tab');
            if (tab) setActiveTab(tab);
        });
        addExpenseBtn.addEventListener('click', function () { openExpenseModal(null); });
        closeExpenseModalBtn.addEventListener('click', closeExpenseModal);
        expenseModal.addEventListener('click', function (e) {
            if (e.target === expenseModal) closeExpenseModal();
        });
        saveExpenseBtn.addEventListener('click', handleSaveExpense);
        deleteExpenseBtn.addEventListener('click', handleDeleteExpense);
        expenseAmountEl.addEventListener('input', updateExpenseShareNote);
        expenseSelectAllBtn.addEventListener('click', function (e) {
            e.preventDefault();
            var memberUids = Object.keys(currentMembers);
            expenseParticipants = expenseParticipants.length === memberUids.length ? [] : memberUids.slice();
            renderExpenseParticipants();
            updateExpenseShareNote();
        });
        closeSettleModalBtn.addEventListener('click', closeSettleModal);
        settleModal.addEventListener('click', function (e) {
            if (e.target === settleModal) closeSettleModal();
        });
        confirmSettleBtn.addEventListener('click', handleConfirmSettle);

        // AI events
        setupAiFabDrag();
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

    function setupAiFabDrag() {
        var fab = aiFabEl;
        var dragging = false;
        var startX = 0, startY = 0, origX = 0, origY = 0;
        var didMove = false;
        var DRAG_THRESHOLD = 6;

        function clampAndApply(x, y) {
            var w = fab.offsetWidth || 54;
            var h = fab.offsetHeight || 54;
            var pad = 8;
            x = Math.max(pad, Math.min(window.innerWidth - w - pad, x));
            y = Math.max(pad, Math.min(window.innerHeight - h - pad, y));
            fab.style.left = x + 'px';
            fab.style.top = y + 'px';
            fab.style.right = 'auto';
            fab.style.bottom = 'auto';
        }

        function restorePosition() {
            try {
                var saved = JSON.parse(localStorage.getItem('aiFabPos') || 'null');
                if (saved && typeof saved.x === 'number') clampAndApply(saved.x, saved.y);
            } catch (e) {}
        }
        restorePosition();
        window.addEventListener('resize', function () {
            var rect = fab.getBoundingClientRect();
            clampAndApply(rect.left, rect.top);
        });

        fab.addEventListener('pointerdown', function (e) {
            dragging = true;
            didMove = false;
            startX = e.clientX;
            startY = e.clientY;
            var rect = fab.getBoundingClientRect();
            origX = rect.left;
            origY = rect.top;
            fab.style.transition = 'none';
            try { fab.setPointerCapture(e.pointerId); } catch (err) {}
        });

        fab.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            var dx = e.clientX - startX;
            var dy = e.clientY - startY;
            if (!didMove && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
                didMove = true;
            }
            if (didMove) clampAndApply(origX + dx, origY + dy);
        });

        function endDrag(e) {
            if (!dragging) return;
            dragging = false;
            fab.style.transition = '';
            try { fab.releasePointerCapture(e.pointerId); } catch (err) {}
            if (didMove) {
                var rect = fab.getBoundingClientRect();
                localStorage.setItem('aiFabPos', JSON.stringify({ x: rect.left, y: rect.top }));
            }
        }
        fab.addEventListener('pointerup', endDrag);
        fab.addEventListener('pointercancel', endDrag);

        // Capture-phase: suppress click if drag occurred
        fab.addEventListener('click', function (e) {
            if (didMove) {
                e.preventDefault();
                e.stopImmediatePropagation();
                didMove = false;
            }
        }, true);
    }

    // === Auth ===
    function isInAppBrowser() {
        var ua = navigator.userAgent || '';
        return /FBAN|FBAV|Instagram|WhatsApp|MicroMessenger|Line\/|Twitter\/|Snapchat/i.test(ua);
    }

    function isMobile() {
        return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    function isSafari() {
        var ua = navigator.userAgent || '';
        return /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|Edg/i.test(ua);
    }

    function handleGoogleLogin() {
        if (isInAppBrowser()) {
            document.getElementById('inappWarning').style.display = '';
            document.getElementById('googleLogin').style.display = 'none';
            return;
        }
        var provider = new firebase.auth.GoogleAuthProvider();
        // Safari/iOS: signInWithRedirect is broken due to ITP storage partitioning.
        // Use popup on Safari and desktop. Use redirect only on Android Chrome.
        if (isMobile() && !isSafari()) {
            showScreen('loading');
            auth.signInWithRedirect(provider);
            return;
        }
        auth.signInWithPopup(provider).catch(function (err) {
            if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
                if (isSafari()) {
                    showToast('Permite popups para este site nas definições do Safari');
                } else {
                    showScreen('loading');
                    auth.signInWithRedirect(provider);
                }
            } else if (err.code === 'auth/web-storage-unsupported' || err.code === 'auth/operation-not-supported-in-this-environment') {
                document.getElementById('inappWarning').style.display = '';
                document.getElementById('googleLogin').style.display = 'none';
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
        currentExpenses = {};
        currentSettlements = {};
        viewMode = 'mine';
        setActiveTab('list');
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
            renderExpensesView();
        });
        attachListener(db.ref('groups/' + gid + '/expenses'), function (snap) {
            currentExpenses = snap.val() || {};
            renderExpensesView();
        });
        attachListener(db.ref('groups/' + gid + '/settlements'), function (snap) {
            currentSettlements = snap.val() || {};
            renderExpensesView();
        });
    }

    function setActiveTab(tab) {
        if (tab !== 'list' && tab !== 'expenses') return;
        activeTab = tab;
        tabNavEl.querySelectorAll('.tab-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
        });
        viewListEl.style.display = tab === 'list' ? '' : 'none';
        viewExpensesEl.style.display = tab === 'expenses' ? '' : 'none';
        addItemFormEl.style.display = tab === 'list' ? '' : 'none';
        addExpenseBarEl.style.display = tab === 'expenses' ? '' : 'none';
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

    // === Expenses ===
    function renderExpensesView() {
        renderBalanceSummary();
        renderExpenseList();
    }

    function activeExpenses() {
        return Object.keys(currentExpenses)
            .map(function (id) { var e = currentExpenses[id]; e._id = id; return e; })
            .filter(function (e) { return !e.deleted; });
    }

    function activeSettlements() {
        return Object.keys(currentSettlements)
            .map(function (id) { var s = currentSettlements[id]; s._id = id; return s; })
            .filter(function (s) { return !s.deleted; });
    }

    function computeBalances() {
        // balances[uid] = cents (positive = group owes user, negative = user owes group)
        var bal = {};
        Object.keys(currentMembers).forEach(function (uid) { bal[uid] = 0; });
        activeExpenses().forEach(function (e) {
            var participants = e.participants || [];
            if (participants.length === 0 || !e.paidBy || typeof e.amountCents !== 'number') return;
            var shares = splitEqualCents(e.amountCents, participants.length);
            // payer is credited the full amount, then debited their share if they participated
            if (bal[e.paidBy] === undefined) bal[e.paidBy] = 0;
            bal[e.paidBy] += e.amountCents;
            participants.forEach(function (uid, i) {
                if (bal[uid] === undefined) bal[uid] = 0;
                bal[uid] -= shares[i];
            });
        });
        activeSettlements().forEach(function (s) {
            if (typeof s.amountCents !== 'number') return;
            if (bal[s.fromUid] === undefined) bal[s.fromUid] = 0;
            if (bal[s.toUid] === undefined) bal[s.toUid] = 0;
            // fromUid pays toUid → from increases (paid off debt), to decreases (received payment)
            bal[s.fromUid] += s.amountCents;
            bal[s.toUid]   -= s.amountCents;
        });
        return bal;
    }

    function simplifyDebts(balances) {
        // Greedy matcher: largest creditor paired with largest debtor.
        var creditors = [];
        var debtors = [];
        Object.keys(balances).forEach(function (uid) {
            var v = balances[uid];
            if (v > 0) creditors.push({ uid: uid, amt: v });
            else if (v < 0) debtors.push({ uid: uid, amt: -v });
        });
        creditors.sort(function (a, b) { return b.amt - a.amt; });
        debtors.sort(function (a, b) { return b.amt - a.amt; });
        var transfers = [];
        var i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            var pay = Math.min(debtors[i].amt, creditors[j].amt);
            if (pay > 0) transfers.push({ fromUid: debtors[i].uid, toUid: creditors[j].uid, amountCents: pay });
            debtors[i].amt -= pay;
            creditors[j].amt -= pay;
            if (debtors[i].amt === 0) i++;
            if (creditors[j].amt === 0) j++;
        }
        return transfers;
    }

    function renderBalanceSummary() {
        var balances = computeBalances();
        var myBalance = balances[currentUser.uid] || 0;
        var hasAny = activeExpenses().length > 0 || activeSettlements().length > 0;

        if (!hasAny) {
            balanceSummaryEl.innerHTML = '<div class="balance-empty">Sem despesas ainda. Adiciona a primeira em baixo.</div>';
            return;
        }

        var balanceClass = myBalance > 0 ? 'positive' : (myBalance < 0 ? 'negative' : 'zero');
        var balanceLabel = myBalance > 0
            ? 'O grupo deve-te'
            : (myBalance < 0 ? 'Deves ao grupo' : 'Estás a zero');
        var balanceValue = myBalance === 0 ? '✓' : formatCents(Math.abs(myBalance));

        var transfers = simplifyDebts(balances);
        var myTransfers = transfers.filter(function (t) { return t.fromUid === currentUser.uid || t.toUid === currentUser.uid; });
        var transfersHtml = myTransfers.map(function (t) {
            if (t.fromUid === currentUser.uid) {
                return '<div class="balance-line owe">' +
                    '<span>Deves <strong>' + formatCents(t.amountCents) + '</strong> a ' + escapeHtml(shortName(getMemberName(t.toUid))) + '</span>' +
                    '<button class="btn-link btn-settle" data-from="' + t.fromUid + '" data-to="' + t.toUid + '" data-cents="' + t.amountCents + '">Marcar pago</button>' +
                    '</div>';
            } else {
                return '<div class="balance-line owed">' +
                    '<span>' + escapeHtml(shortName(getMemberName(t.fromUid))) + ' deve-te <strong>' + formatCents(t.amountCents) + '</strong></span>' +
                    '<button class="btn-link btn-settle" data-from="' + t.fromUid + '" data-to="' + t.toUid + '" data-cents="' + t.amountCents + '">Recebido</button>' +
                    '</div>';
            }
        }).join('');

        balanceSummaryEl.innerHTML =
            '<div class="balance-hero ' + balanceClass + '">' +
                '<div class="balance-label">' + balanceLabel + '</div>' +
                '<div class="balance-value">' + balanceValue + '</div>' +
            '</div>' +
            (transfersHtml ? '<div class="balance-transfers">' + transfersHtml + '</div>' : '<div class="balance-empty">Saldos zerados entre todos ✨</div>');

        balanceSummaryEl.querySelectorAll('.btn-settle').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openSettleModal({
                    fromUid: btn.getAttribute('data-from'),
                    toUid: btn.getAttribute('data-to'),
                    suggestedCents: parseInt(btn.getAttribute('data-cents'), 10) || 0
                });
            });
        });
    }

    function renderExpenseList() {
        var list = activeExpenses().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        expensesCountEl.textContent = list.length;
        if (list.length === 0) {
            expensesListEl.innerHTML = '';
            return;
        }
        expensesListEl.innerHTML = '';
        list.forEach(function (e) {
            expensesListEl.appendChild(createExpenseCard(e));
        });
    }

    function createExpenseCard(e) {
        var card = document.createElement('div');
        card.className = 'expense-card';
        var cat = getCategory(e.category);
        var participants = e.participants || [];
        var youParticipate = participants.indexOf(currentUser.uid) !== -1;
        var youPaid = e.paidBy === currentUser.uid;
        var shares = splitEqualCents(e.amountCents || 0, participants.length || 1);
        var yourShare = 0;
        if (youParticipate) {
            var idx = participants.indexOf(currentUser.uid);
            yourShare = shares[idx];
        }
        var youDelta = (youPaid ? (e.amountCents || 0) : 0) - yourShare;

        var deltaHtml = '';
        if (youDelta > 0) deltaHtml = '<span class="expense-delta positive">+' + formatCents(youDelta) + '</span>';
        else if (youDelta < 0) deltaHtml = '<span class="expense-delta negative">' + formatCents(youDelta) + '</span>';
        else deltaHtml = '<span class="expense-delta zero">—</span>';

        var payerName = shortName(getMemberName(e.paidBy)) || 'Alguém';
        var participantsHtml = participants.map(function (uid) { return shortName(getMemberName(uid)); }).join(', ');

        card.innerHTML =
            '<div class="expense-cat">' + cat.emoji + '</div>' +
            '<div class="expense-details">' +
                '<div class="expense-desc">' + escapeHtml(e.description || '(sem descrição)') + '</div>' +
                '<div class="expense-meta">' + escapeHtml(payerName) + ' pagou ' + formatCents(e.amountCents || 0) +
                    ' • ' + participants.length + (participants.length === 1 ? ' pessoa' : ' pessoas') +
                '</div>' +
            '</div>' +
            '<div class="expense-side">' + deltaHtml + '</div>';

        card.title = 'Dividido entre: ' + participantsHtml;
        card.addEventListener('click', function () { openExpenseModal(e); });
        return card;
    }

    function openExpenseModal(existingExpense) {
        expenseEditingId = existingExpense ? existingExpense._id : null;
        expenseModalTitleEl.textContent = existingExpense ? 'Editar despesa' : 'Nova despesa';
        deleteExpenseBtn.style.display = existingExpense ? '' : 'none';

        if (existingExpense) {
            expenseDescriptionEl.value = existingExpense.description || '';
            expenseAmountEl.value = (Math.abs(existingExpense.amountCents) / 100).toFixed(2).replace('.', ',');
            expenseCategoryEl.value = getCategory(existingExpense.category).key;
            expensePayer = existingExpense.paidBy || currentUser.uid;
            expenseParticipants = (existingExpense.participants || []).slice();
        } else {
            expenseDescriptionEl.value = '';
            expenseAmountEl.value = '';
            expenseCategoryEl.value = 'outros';
            expensePayer = currentUser.uid;
            expenseParticipants = Object.keys(currentMembers); // default: split with everyone
        }
        renderExpensePayer();
        renderExpenseParticipants();
        updateExpenseShareNote();
        expenseModal.style.display = 'flex';
        setTimeout(function () { expenseDescriptionEl.focus(); }, 50);
    }

    function closeExpenseModal() {
        expenseModal.style.display = 'none';
        expenseEditingId = null;
    }

    function renderExpensePayer() {
        var memberUids = Object.keys(currentMembers);
        expensePayerListEl.innerHTML = memberUids.map(function (uid) {
            var name = shortName(getMemberName(uid)) || 'Utilizador';
            var checked = expensePayer === uid;
            return '<label class="payer-chip ' + (checked ? 'checked' : '') + '">' +
                '<input type="radio" name="payer" value="' + uid + '" ' + (checked ? 'checked' : '') + '>' +
                '<span>' + escapeHtml(name) + '</span>' +
                '</label>';
        }).join('');
        expensePayerListEl.querySelectorAll('input[type=radio]').forEach(function (r) {
            r.addEventListener('change', function () {
                expensePayer = r.value;
                renderExpensePayer();
            });
        });
    }

    function renderExpenseParticipants() {
        var memberUids = Object.keys(currentMembers);
        expenseParticipantsListEl.innerHTML = memberUids.map(function (uid) {
            var name = shortName(getMemberName(uid)) || 'Utilizador';
            var checked = expenseParticipants.indexOf(uid) !== -1;
            return '<label class="participant-chip ' + (checked ? 'checked' : '') + '">' +
                '<input type="checkbox" value="' + uid + '" ' + (checked ? 'checked' : '') + '>' +
                '<span>' + escapeHtml(name) + '</span>' +
                '</label>';
        }).join('');
        expenseParticipantsListEl.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
            cb.addEventListener('change', function () {
                var uid = cb.value;
                if (cb.checked) {
                    if (expenseParticipants.indexOf(uid) === -1) expenseParticipants.push(uid);
                } else {
                    expenseParticipants = expenseParticipants.filter(function (u) { return u !== uid; });
                }
                renderExpenseParticipants();
                updateExpenseShareNote();
            });
        });
    }

    function updateExpenseShareNote() {
        var cents = parseAmountToCents(expenseAmountEl.value);
        if (isNaN(cents) || cents <= 0 || expenseParticipants.length === 0) {
            expenseShareNoteEl.textContent = '';
            return;
        }
        var shares = splitEqualCents(cents, expenseParticipants.length);
        var min = Math.min.apply(null, shares);
        var max = Math.max.apply(null, shares);
        if (min === max) {
            expenseShareNoteEl.textContent = 'Cada um paga ' + formatCents(min);
        } else {
            expenseShareNoteEl.textContent = 'Cada um paga ' + formatCents(min) + ' (alguns ' + formatCents(max) + ' pelo resto)';
        }
    }

    function handleSaveExpense() {
        var description = expenseDescriptionEl.value.trim();
        if (!description) { showToast('Escreve uma descrição'); expenseDescriptionEl.focus(); return; }
        var cents = parseAmountToCents(expenseAmountEl.value);
        if (isNaN(cents) || cents <= 0) { showToast('Valor inválido'); expenseAmountEl.focus(); return; }
        if (!expensePayer) { showToast('Escolhe quem pagou'); return; }
        if (expenseParticipants.length === 0) { showToast('Escolhe pelo menos uma pessoa para dividir'); return; }

        var data = {
            description: description,
            amountCents: cents,
            category: expenseCategoryEl.value || 'outros',
            paidBy: expensePayer,
            paidByName: getMemberName(expensePayer),
            participants: expenseParticipants.slice(),
            createdBy: currentUser.uid,
            createdByName: currentUser.displayName || 'Utilizador'
        };

        if (expenseEditingId) {
            // Warn if any settlement exists for the pair — simplistic warning
            var hasSettlements = activeSettlements().length > 0;
            if (hasSettlements && !confirm('Já há liquidações no grupo. Alterar esta despesa vai mexer nos saldos. Continuar?')) return;
            data.editedAt = firebase.database.ServerValue.TIMESTAMP;
            data.editedBy = currentUser.uid;
            db.ref('groups/' + currentGroupId + '/expenses/' + expenseEditingId).update(data)
                .then(closeExpenseModal)
                .catch(function (err) { showToast('Erro: ' + err.message); });
        } else {
            data.createdAt = firebase.database.ServerValue.TIMESTAMP;
            data.deleted = false;
            db.ref('groups/' + currentGroupId + '/expenses').push(data)
                .then(closeExpenseModal)
                .catch(function (err) { showToast('Erro: ' + err.message); });
        }
    }

    function handleDeleteExpense() {
        if (!expenseEditingId) return;
        var hasSettlements = activeSettlements().length > 0;
        var msg = hasSettlements
            ? 'Já há liquidações no grupo. Apagar esta despesa vai mexer nos saldos. Continuar?'
            : 'Apagar esta despesa?';
        if (!confirm(msg)) return;
        db.ref('groups/' + currentGroupId + '/expenses/' + expenseEditingId).update({
            deleted: true,
            deletedAt: firebase.database.ServerValue.TIMESTAMP,
            deletedBy: currentUser.uid
        }).then(closeExpenseModal)
          .catch(function (err) { showToast('Erro: ' + err.message); });
    }

    function openSettleModal(ctx) {
        settleContext = ctx;
        var fromName = shortName(getMemberName(ctx.fromUid)) || 'Alguém';
        var toName = shortName(getMemberName(ctx.toUid)) || 'Alguém';
        settleSummaryEl.innerHTML = '<strong>' + escapeHtml(fromName) + '</strong> → <strong>' + escapeHtml(toName) + '</strong>';
        settleAmountEl.value = (ctx.suggestedCents / 100).toFixed(2).replace('.', ',');
        settleModal.style.display = 'flex';
        setTimeout(function () { settleAmountEl.focus(); settleAmountEl.select(); }, 50);
    }

    function closeSettleModal() {
        settleModal.style.display = 'none';
        settleContext = null;
    }

    function handleConfirmSettle() {
        if (!settleContext) return;
        var cents = parseAmountToCents(settleAmountEl.value);
        if (isNaN(cents) || cents <= 0) { showToast('Valor inválido'); return; }
        db.ref('groups/' + currentGroupId + '/settlements').push({
            fromUid: settleContext.fromUid,
            fromName: getMemberName(settleContext.fromUid),
            toUid: settleContext.toUid,
            toName: getMemberName(settleContext.toUid),
            amountCents: cents,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdBy: currentUser.uid,
            deleted: false
        }).then(function () {
            closeSettleModal();
            showToast('Liquidação registada ✓');
        }).catch(function (err) { showToast('Erro: ' + err.message); });
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
            var desc = '[id:' + id + '] ' + it.name +
                       (it.quantity ? ' (' + it.quantity + (it.unit ? ' ' + it.unit : '') + ')' : '') +
                       ' [categoria: ' + (it.category || 'outros') + ']' +
                       ' — adicionado por ' + (it.addedByName || 'alguém');
            if (it.checked) checked.push(desc); else pending.push(desc);
        });

        lines.push('Por comprar (' + pending.length + '): ' + (pending.length ? pending.join('; ') : 'nenhum'));
        lines.push('Já comprado (' + checked.length + '): ' + (checked.length ? checked.join('; ') : 'nenhum'));

        var memberNames = Object.values(currentMembers).map(function (m) { return m.name || 'Alguém'; });
        lines.push('Membros do grupo: ' + (memberNames.length ? memberNames.join(', ') : 'só tu'));
        lines.push('Categorias disponíveis: ' + CATEGORIES.map(function(c){ return c.key; }).join(', '));
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
                description: 'Obtém um resumo actualizado da lista de compras, incluindo os IDs dos itens.',
                parameters: { type: 'OBJECT', properties: {} }
            },
            {
                name: 'updateItemCategories',
                description: 'Actualiza a categoria de um ou mais artigos existentes na lista. Usa os IDs que aparecem no contexto da lista.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        updates: {
                            type: 'ARRAY',
                            description: 'Lista de actualizações a fazer',
                            items: {
                                type: 'OBJECT',
                                properties: {
                                    itemId:   { type: 'STRING', description: 'ID do artigo (ex: -Ou23xUw...)' },
                                    category: { type: 'STRING', description: 'Nova categoria: frutas, lacticinios, padaria, carne, mercearia, bebidas, higiene, limpeza, congelados, outros' }
                                },
                                required: ['itemId', 'category']
                            }
                        }
                    },
                    required: ['updates']
                }
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
        if (name === 'updateItemCategories') {
            var updates = args.updates || [];
            var updated = [], failed = [];
            updates.forEach(function (u) {
                if (!u.itemId || !u.category) return;
                var validKeys = CATEGORIES.map(function(c){ return c.key; });
                var cat = validKeys.indexOf(u.category) >= 0 ? u.category : 'outros';
                if (currentItems[u.itemId]) {
                    db.ref('groups/' + currentGroupId + '/items/' + u.itemId).update({ category: cat });
                    updated.push((currentItems[u.itemId].name || u.itemId) + ' → ' + cat);
                } else {
                    failed.push(u.itemId);
                }
            });
            return { success: true, updated: updated, failed: failed };
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
            'Tens três ferramentas: ' +
            '1) addItemToList — adiciona novos artigos à lista; ' +
            '2) updateItemCategories — actualiza a categoria de artigos existentes (usa os IDs do contexto); ' +
            '3) getListSummary — consulta o estado actual da lista com os IDs dos itens. ' +
            'Quando o utilizador pedir para categorizar, usa PRIMEIRO getListSummary para ver os IDs e depois updateItemCategories para actualizar. ' +
            'Quando o utilizador pedir sugestões, adiciona os artigos directamente com addItemToList. ' +
            'Após cada acção, confirma o que fizeste de forma breve e divertida. ' +
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
                conversationContents.push({ role: 'user', parts: toolResults });
                return geminiRequest(conversationContents).then(processResponse);
            }

            var text = parts.filter(function (p) { return p.text; }).map(function (p) { return p.text; }).join('\n').trim();
            if (!text) {
                // AI só fez tool calls sem texto final — pedir confirmação
                return 'Feito! ✅';
            }
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
