// Initialize app
var myApp = new Framework7({
    cache: false,
    tapHold: true
});




// If we need to use custom DOM library, let's save it to $$ variable:
var $$ = Dom7;

// Add view
var mainView = myApp.addView('.view-main', {
    // Because we want to use dynamic navbar, we need to enable it for this view:
    dynamicNavbar: true
});




//verfica o tipo de conexao
function checkConnection() {
    var networkState = navigator.connection.type;
    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.CELL]     = 'Cell generic connection';
    states[Connection.NONE]     = 'No network connection';
    teste = states[networkState];
return teste;
    //alert('Connection type: ' + states[networkState]);
}

//seta variaval de login
var idUsuario;

//executa quando o aparelho estiver pronto
$$(document).on('deviceready', function() {
    console.log("Device is ready!");
      
      //se nao estiver logado abre tela de login
      if(idUsuario == null){
      myApp.loginScreen('.login-screen');
    }
    
    //oculta barra
      mainView.hideToolbar();

//oculta load
myApp.showIndicator();

//chama o banco
    var db = banco();
   db.transaction(populateDB, errorCB);


//mostra as visitas nao sincronizadas
show();

//deleta as fotos que nao tem visita
deletaFoto();

});


//abre o banco de dados
function banco(){
       var db = openDatabase('asf','1,0','armazenamento offiline',(2*1024*1024));
       return db;
} 

//cria a tabela se ela nao existir
function populateDB(tx){
  //tx.executeSql('DROP TABLE IF EXISTS TB_VISITAS');
    //tx.executeSql('DROP TABLE IF EXISTS TB_FOTOS');
  tx.executeSql('CREATE TABLE IF NOT EXISTS TB_VISITAS (idVisita INTEGER PRIMARY KEY AUTOINCREMENT, cliente VARCHAR(255), descritivo LONGTEXT, dataVisita DATETIME, usuario VARCHAR(255), status INT(2))');
  tx.executeSql('CREATE TABLE IF NOT EXISTS TB_FOTOS (idFoto INTEGER PRIMARY KEY AUTOINCREMENT, idVisita INT(100), foto BLOB NOT NULL)');
}


//alertas sucesso e erro do banco
function errorCB(err){
    myApp.alert('erro:'+err.code);
}
function successCB(){
    myApp.alert('nao deu erro');
}


//retorna as fotos do banco local
function getFotos(){
    var db = banco();
    db.transaction(function(tx){
        tx.executeSql('SELECT foto FROM TB_FOTOS WHERE idVisita = "0"  ORDER BY idFoto DESC limit 1',[],function(tx,results){
                var linhas = results.rows.length;
    for(i = 0; i < linhas; i++){
    var pega = "data:image/jpeg;base64," + results.rows.item(i).foto;
    var idfoto = results.rows.item(i).idFoto;
    setTimeout(function(){
            $$('.thumbs').prepend('<a href="#" id="'+idfoto+'" class="exlcuifoto"><img src="'+pega+'" width="45%" style="padding:5px;"/></a>');
    },10);
    }
        });
    });
}


//mostra as visitas nao sincronizadas
function show(){
    var db = banco();
    db.transaction(function(tx){
        tx.executeSql('SELECT * FROM TB_VISITAS ORDER BY idVisita DESC',[],function(tx,results){
            var linhas = results.rows.length;
           
if(linhas <= 0){
    $$('.lsvisitas').html('TODAS AS VISITAS ESTÃO SINCRONIZADAS!');
  
}else{
           for(i=0; i < linhas; i++){
            var dt = results.rows.item(i).dataVisita;
          var dataVisita = moment(dt).format('D/MM/YYYY HH:mm');
          var descritivo = results.rows.item(i).descritivo;
          var desc = descritivo.replace("\n","<br/>");
            $$('.nosync').append('<li >'+
                '<a href="#" class="item-link item-content visita" id="'+results.rows.item(i).idVisita+'">'+
                '<div class="item-media"><span class="button button-fill color-indigo">'+results.rows.item(i).idVisita+'</span></div>'+
                '<div class="item-inner">'+
                '<div class="item-title-row">'+
                '<div class="item-title">'+results.rows.item(i).cliente+'</div>'+
                '<div class="item-after">'+dataVisita+'</div>'+
                '</div>'+
                '<div class="item-subtitle">'+desc+'</div>'+
                '<div class="item-text">'+results.rows.item(i).usuario+'</div></div></a></li>');
           }
       }
        });

    },errorCB);

 setTimeout(function(){
    $$('.loader').addClass('animated fadeOut');
myApp.hideIndicator();
 },1000);
 setTimeout(function(){
    $$('.loader').hide();
 },1000);

}


//executa o sincronismo com o banco hostgator
$$(document).on('click','.sincronizar',function(){
   var db = banco();
   db.transaction(function(tx){
    tx.executeSql('SELECT * FROM TB_VISITAS',[],function(tx,results){
        var linhas = results.rows.length;
        if(linhas != 0){
             myApp.showPreloader();
        for(i=0; i <= linhas; i++){
               var desc = results.rows.item(i).descritivo;
               var idteste = results.rows.item(i).idVisita;
               var dt = results.rows.item(i).dataVisita;
                        var cli = results.rows.item(i).cliente;
            $$.post('http://www.asf.ind.br/painel/mobile/post.php',{acao:'cliente',descritivo: desc, cliente: cli, dataVisita: dt},function(data){
    myApp.hidePreloader();
               delVisita();
                mainView.refreshPage();
            });
        }
    }else{
         myApp.alert('voce nao tem visitas para sincronizar');

    }
    });
   });
});

//apaga as visitas apos o sincronismo
function delVisita(){
    var db = banco();
    db.transaction(function(tx){
      tx.executeSql('DELETE FROM TB_VISITAS');
      myApp.alert('','Todas as visitas foram sincronizadas');
    });
}


//recupera o ulimo id para gerar o id da proxima visita
function ultimoID(){
    var db = banco();
    var soma;
    db.transaction(function(tx){
        tx.executeSql('SELECT idVisita FROM TB_VISITAS ORDER BY idVisita DESC LIMIT 1',[],function(tx,results){
            var ultimo = results.rows.item(0).idVisita;
             var soma = ultimo+1; 
             updateFoto(soma);
        });
    });
}


//anexa as fotos a tabela visitas
function updateFoto(soma){
    var db = banco();
    db.transaction(function(tx){
        tx.executeSql('UPDATE TB_FOTOS SET idVisita  = ? WHERE idVisita = "0"',[soma]);
        //myApp.alert('foi'+soma);
    });
}


//funcao para deletar as fotos que nao foram salvas
function deletaFoto(){
    var db = banco();
    db.transaction(function(tx){
        tx.executeSql('DELETE FROM TB_FOTOS WHERE idVisita = "0" ');
    },errorCB);
}


//acao que deleta a foto selecionada
$$(document).on('taphold','.exlcuifoto',function(){
     var id = $$(this).attr('id');
    var buttons = [
    {
    text: 'Editar',
    onClick: function(){
        myApp.alert('editar');
    }
},
    {
    text: 'Deletar',
    color: 'red',
    onClick: function(){
myApp.confirm('','Tem certeza que deseja deletar esta foto?',function(){
         var db = banco();
         db.transaction(function(tx){
            tx.executeSql('DELETE FROM TB_FOTOS WHERE idFoto = ?',[id]);
         },errorCB,function(){
          var get =  document.getElementById(id);
     $$(get).remove();
         });
});
   
    }
}
    ];
    myApp.actions(buttons);
});



//insere a foto no banco
function insertFoto(imageData){
  var db = banco();
  var idVisita = 0;
  db.transaction(function(tx){
    tx.executeSql('INSERT INTO TB_FOTOS (idVisita, foto) VALUES (?,?)',[idVisita, imageData]);
  },errorCB,function(){
  setTimeout(function(){
    getFotos();
  },10);

  });

};


//oculta a barra ao clickar no botao voltar
$$(document).on('click','.back',function(){
     mainView.hideToolbar();
});


//abre a camera
 function foto() {

     navigator.camera.getPicture(onSuccess, onFail, { quality: 80,
    destinationType: Camera.DestinationType.DATA_URL,
    encodingType: Camera.EncodingType.JPEG,
    saveToPhotoAlbum: false,
    targetWidth: 1024,
    targetHeight:768
});
     //acao se conseguir captrurar foto
     function onSuccess(imageData) {
//grava a foto no banco
insertFoto(imageData);
}


//mensagem se houver erro
function onFail(message) {
   // alert('Failed because: ' + message);
}
//fim tirar foto
    }


//botao abre a camera
$$(document).on('click','#camera',function(){
    foto();
});


//envia os dados de login para o servidor
$$(document).on('click','.logar',function(){
    var login = $$('#login').val();
    var senha = $$('#senha').val();
    $$.post('http://www.asf.ind.br/painel/mobile/post.php',{acao:'logar',login: login, senha: senha},function(data){
        if(data > 0){
    //    myApp.alert(data);
        idUsuario = data;
     myApp.closeModal('.login-screen');
}else{
    myApp.alert('','Usuário ou senha invalido!');
}
    });
});


//funcao botao enviar
$$(document).on('click','#enviar',function(){
    ultimoID();
    myApp.showIndicator();
    var cliente = $$('#cliente').val();
    var descritivo = $$('#descritivo').val();
    var desc = descritivo.replace("\n","<br/>");
    var datadb = moment().format('YYYY-M-D HH:mm:ss');
  if(cliente == ''){
    myApp.alert('Voce deve preencher o campo cliente');
  }else if(descritivo == ''){
    myApp.alert('Voce deve preencher o campo descritivo');
  }else{
  var db = banco();
  var usuario = 'sergio';
  db.transaction(function(tx){
    tx.executeSql('INSERT INTO TB_VISITAS (cliente, descritivo, dataVisita, usuario) VALUES (?,?,?,?)',[cliente, desc, datadb, usuario]);
  },errorCB,function(){
  myApp.alert('Visita adicionada com sucesso!','Sistema ASF');
  mainView.router.loadPage('index.html');
  });

  }
});

$$(document).on('taphold','.visita',function(){
     var id = $$(this).attr('id');
    var buttons = [
    {
    text: 'Editar',
    onClick: function(){
        myApp.alert('editar');
    }
},
    {
    text: 'Deletar',
    color: 'red',
    onClick: function(){
myApp.confirm('','Tem certeza que deseja deletar esta visita?',function(){
         var db = banco();
         db.transaction(function(tx){
            tx.executeSql('DELETE FROM TB_VISITAS WHERE idVisita = ?',[id]);
            tx.executeSql('DELETE FROM TB_FOTOS WHERE idVisita = ?',[id]);
         },errorCB,function(){
            mainView.router.refreshPage();
         });
});
   
    }
}
    ];
    myApp.actions(buttons);
});


    $$(document).on('click','.visita',function(e){
         var id = $$(this).attr('id');
        
     mainView.router.loadPage('view.html');
     setTimeout(function(){
         view(id);
     },100);


     });

function view(id){
       var db = banco();
     db.transaction(function(tx){
        tx.executeSql('SELECT TB_FOTOS.idVisita, TB_FOTOS.foto, TB_VISITAS.descritivo FROM TB_VISITAS LEFT OUTER JOIN TB_FOTOS ON TB_VISITAS.idVisita = TB_FOTOS.idVisita WHERE TB_VISITAS.idVisita = ? ORDER BY TB_FOTOS.idFoto DESC',[id],function(tx,results){
         var linhas = results.rows.length;
          var res = [];
         for(i=0; i < linhas; i++){   
           var valida = results.rows.item(i).foto;
         if(valida == null){
$$('.swiper-container').css({'display':'none'});
}else{
    $$('.swiper-container').css({'display':'block'});
}
      $$('.slide').append('<div class="swiper-slide"><span><img src="data:image/jpeg;base64,'+results.rows.item(i).foto+'" width="100%" /></span></div>');
            //res.push(' <div class="swiper-slide"><span><img src="data:image/jpeg;base64,'+results.rows.item(i).foto+'" width="100%" /></span></div>');   
        }
        //$$('.slide').append(res.join(""));
 var mySwiper = myApp.swiper('.swiper-container', { pagination:'.swiper-pagination' });
 $$('.descri').append(results.rows.item(0).descritivo);
        });
     });
}



myApp.onPageInit('view', function (page) {
           // var mySwiper = myApp.swiper('.swiper-container', { pagination:'.swiper-pagination' });
}).trigger();

$$(document).on('pageInit', function (e) {
    var page = e.detail.page;
    if (page.name === 'about') {
        myApp.closePanel();
    }

     if (page.name === 'lista') {
              mainView.hideToolbar();
        myApp.closePanel();
            myApp.showIndicator();
$$.ajax({
    type: 'GET',
   url: 'http://www.asf.ind.br/painel/mobile/todos.php',
   success: function(data){
   $$('.lista').html(data);
    myApp.hideIndicator();
   }
});
    }

     if (page.name === 'add') {
    
        myApp.closePanel();
        mainView.showToolbar();
        deletaFoto();

    }


      if (page.name === 'index') {

              mainView.hideToolbar();
                  myApp.closePanel();
        show();
       myApp.hideIndicator();
         $$('.loader').addClass('animated fadeOut');
         $$('.loader').css({'z-index':'-99'});
         deletaFoto();

    }

})

// Option 2. Using live 'pageInit' event handlers for each page
$$(document).on('pageInit', '.page[data-page="about"]', function (e) {
    // Following code will be executed for page with data-page attribute equal to "about"
    myApp.alert('Here comes About page');
})