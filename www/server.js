var client = {
    test: {
        readFile: function() {
            var file = $('#uploadFile')[0];
            fr = new FileReader();
            fr.onload = function(e) {
                var fileContent = fr.result;
                console.log(fileContent);
            };

            fr.readAsText(file.files[0]);
        }
    },

    explorer: {
        $filesDialog: null,
        $filesTable: null,
        $filesTableToolbar: null,

        getFileList: function() {
            var telegram = client.websocket.telegrams.getFileList;
            telegram.targetDevice = client.devices.getSelectedMac();

            client.websocket.connection.send(JSON.stringify(telegram));
        }
    },

    websocket: {

        connection: null,

        telegrams: {

            getFileList: {
                type: 'getFileList',
                targetDevice: null
            },

            fileToDevice: {
                type: 'fileToDevice',
                path: null,
                content: null,
                targetDevice: null
            },

            rebootDevice: {
                type: 'rebootDevice',
                targetDevice: null
            },

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
            },

            getOnlineDevices: {
                type: 'getOnlineDevices'
            },

            getRules: {
                type: 'getRules'
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

            client.explorer.$filesDialog = $('#filesDialog').dialog({
                autoOpen: false,
                modal: true,
                buttons: {
                    Cancel: function() {
                        client.explorer.$filesDialog.dialog('close');
                    }
                }
            });
        
            client.explorer.$filesTable = $('#filesTable').jqGrid({
                datatype: 'local',
                colNames: [' ', 'Name', 'Size'],
                colModel: [
                    {name: 'icon'},
                    {name: 'name'},
                    {name: 'size'}
                ],
                rowNum: 20,
                caption: 'File Explorer',
                width: 800,
                toolbar: [true, 'top']
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

            $('#rulesTable').jqGrid({
                datatype: 'local',
                colNames: ['Name', 'Source', 'Event', 'Target', 'Action'],
                colModel: [
                    {name: 'name'},
                    {name: 'source'},
                    {name: 'event'},
                    {name: 'target'},
                    {name: 'action'}
                ],
                rowNum: 20,
                caption: 'Rules',
                width: 1000
            });

        var $onlineDevicesTable = $('#onlineDevicesTable');

            $onlineDevicesTable.jqGrid({
                datatype: 'local',
                colNames: ['IP', 'MAC', 'Hw-Class'],
                colModel: [
                    {name: 'ip'},
                    {name: 'mac'},
                    {name: 'hwClass'}
                ],
                rowNum: 20,
                caption: 'Online Devices',
                width: 1000,
                toolbar: [true, 'top']
            });

            var $onlineDevicesTableToolbar = $('#t_onlineDevicesTable');
            $onlineDevicesTableToolbar.append('<button onclick="client.devices.reboot()">Reboot</button>');
            $onlineDevicesTableToolbar.append('<button onlick="">File Explorer</button>');

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

    devices: {

        getSelectedMac: function() {
            var deviceMacId = $('#onlineDevicesTable').jqGrid('getGridParam', 'selrow');
            var deviceMacRow = $('#onlineDevicesTable').jqGrid('getRowData', deviceMacId);
            var deviceMac = deviceMacRow.mac;

            return deviceMac;
        },

        reboot: function() {
            var deviceMac = client.devices.getSelectedMac();
            var telegram = client.websocket.telegrams.rebootDevice;
            telegram.targetDevice = deviceMac;

            client.websocket.connection.send(JSON.stringify(telegram));
        },

        upload: function() {
            var deviceMac = client.devices.getSelectedMac();

            var fileName = $('#uploadFileName').val();

            var file = $('#uploadFile')[0];
            var fileContent = null;
            fr = new FileReader();
            fr.onload = function(e) {
                fileContent = fr.result;
                //console.log(fileContent);

                var telegram = client.websocket.telegrams.fileToDevice;
                telegram.path = fileName;
                telegram.content = fileContent;
                telegram.targetDevice = deviceMac;

                client.websocket.connection.send(JSON.stringify(telegram));                
            };

            fr.readAsText(file.files[0]);
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
                                } else {
                                    client.websocket.connection.send(JSON.stringify(client.websocket.telegrams.getOnlineDevices));                                    
                                    client.websocket.connection.send(JSON.stringify(client.websocket.telegrams.getRules));
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

                        case 'getOnlineDevices':
                            $('#onlineDevicesTable')[0].addJSONData(telegram.value.devices);
                            break;

                        case 'getRules':
                            $('#rulesTable')[0].addJSONData(telegram.value);
                            break;
                    }
                break;
            }

        }
    }
}