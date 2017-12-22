var client = {
    websocket: {

        connection: null,

        telegrams: {
            checkConfigState: {
                type: 'checkConfigState'
            },

            saveAdminAccount: {
                type: 'saveAdminAccount',
                name: null,
                password1: null
            },

            login: {
                type: 'login',
                name: null,
                password: null
            }
        },

        init: function() {

            client.wizard.dialog = $('#wizardDialog').dialog({
                autoOpen: false,
                modal: true,
                buttons: {
                    "Save": client.wizard.saveAdmin,
                    Cancel: function() {
                        location.href = '/';
                    }
                }
            });

            client.session.loginDialog = $('#loginDialog').dialog({
                autoOpen: false,
                modal: true,
                buttons: {
                    "Login": client.session.login,
                    Cancel: function() {
                        location.href = '/';
                    }
                }
            });

            $('#tabs').tabs();

            $('#rulesTable').DataTable({
                searching: false,
                columns: [
                    {title: "Name"},
                    {title: "Source"},
                    {title: "Event"},
                    {title: "Target"},
                    {title: "Action"}
                ]
            });

            client.websocket.connection = new WebSocket('ws://192.168.178.169');
            client.websocket.connection.onopen = client.websocket.onOpen;
            client.websocket.connection.onmessage = client.websocket.onMessage;
        },

        onOpen: function() {
            client.websocket.connection.send(JSON.stringify(client.websocket.telegrams.checkConfigState));
        },

        onMessage: function(message) {
            var telegram = JSON.parse(message.data);
            client.protocol.process(telegram);
        }
    },

    wizard: {

        dialog: null,

        start: function() {
            client.wizard.dialog.dialog('open');
        },

        validateRootAccount: function(cb) {
            var name = $('#wizardAdminName').val();
            var password1 = $('#wizardAdminPassword1').val();
            var password2 = $('#wizardAdminPassword2').val();

            var err = new Array();
            if(name.length == 0)
                err.push("Name is empty");
            if(name.length < 3)
                err.push("Name is to short");
            if(password1.length == 0)
                err.push("Password is empty");
            if(password1.length < 8)
                err.push("Password is to short");
            if(password1 != password2)
                err.push("Password and Password Confirmation are not the same");
            
            cb(err, name, password1, password2);
        },

        saveAdmin: function() {
            client.wizard.validateRootAccount(function(err, name, password1, password2) {
                if(err.length > 0) {
                    alert(err.join("\n"));
                    return;
                }
                var telegram = client.websocket.telegrams.saveAdminAccount;
                telegram.name = name;
                telegram.password1 = password1;
    
                client.websocket.connection.send(JSON.stringify(telegram));
            })
        }
    },

    session: {
        loginDialog: null,

        hasSession: function() {
            var sid = Cookies.get('sid');
            if(sid === undefined)
                return false;
            else
                return true;
        },

        start: function() {
            client.session.loginDialog.dialog('open');
        },

        validateLogin: function(cb) {
            var name = $('#loginName').val();
            var password = $('#loginPassword').val();

            var err = new Array();
            if(name.length == 0)
                err.push('Name is empty');
            if(password.length == 0)
                err.push('Password is empty');

            cb(err, name, password);
           
        },

        login: function() {
            
            client.session.validateLogin(function(err, name, password) {

                if(err.length > 0) {
                    alert(err.join('\n'));
                    return;
                }

                var telegram = client.websocket.telegrams.login;
                telegram.name = name;
                telegram.password = password;
    
                client.websocket.connection.send(JSON.stringify(telegram));
            });

        }
    },

    protocol: {
        process: function(telegram) {

            switch(telegram.type) {
                case "response":
                    switch(telegram.action) {
                        case "checkConfigState":
                            if(telegram.value === 'NO') {
                                client.wizard.start();
                            } else {
                                if(!client.session.hasSession()) {
                                    client.session.start();
                                }
                            }
                            break;
                        
                        case 'login':
                            if(!telegram.value.state)
                                alert(telegram.value.err);
                            else
                                var sid = telegram.value.sid;
                                client.session.loginDialog.dialog('close');
                                Cookies.set('sid', sid);
                            break;
                    }
                break;
            }

        }
    }
}