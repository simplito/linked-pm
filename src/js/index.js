window.jQuery = require('jquery');
window.$ = window.jQuery;
window.Clipboard = require("clipboard");

var sjcl = require("sjcl"),
    alertify = require("alertify.js"),
    autosize = require("autosize"),
    download = require("downloadjs"),
    QRCode = require("qrcode-js-package");

require("./hideablePassword");

window.autosize = autosize;

var DOMAIN_NAME = "https://Linked.PM/";
var MODE = "encrypt";
var HASH_CHANGED = false;

function onFiledsChange(evt){
    var message = $("#input").val();
    var password = $("#password").hideablePassword("get");
    
    if(message.length > 0 && password.length >= 5){
        $("#generate").removeAttr("disabled");
    }else{
        $("#generate").attr("disabled", "disabled");
    }
    
    if(password.length >= 5){
        $("#reply").removeAttr("disabled");
    }else{
        $("#reply").attr("disabled", "disabled");
    }
    
    if(MODE == "decrypt" && message.length > 0){
        $("#download").removeAttr("disabled");
    }else if(MODE == "decrypt"){
        $("#download").attr("decrypt");
    }
}

function setSelectionRange(input, selectionStart, selectionEnd) {
    if (input.setSelectionRange) {
        input.focus();
        input.setSelectionRange(selectionStart, selectionEnd);
    }
    else if (input.createTextRange) {
        var range = input.createTextRange();
        range.collapse(true);
        range.moveEnd('character', selectionEnd);
        range.moveStart('character', selectionStart);
        range.select();
    }else{
        input.focus();
    }
}

function prepareViews(){
    if(MODE == "encrypt"){
        $("#generate span.name").text("encrypt")
        $("#passField").attr("placeholder", "Enter password (min 5 characters)")
    }else{
        $("#generate span.name").text("decrypt")
        $("#passField").attr("placeholder", "Enter password")
    }
}

function getHashFromLink(link){
    var parser = document.createElement('a');
    parser.href = link;
    
    if(!parser.hash){
        return;
    }
    
    return parser.hash.slice(1, parser.hash.length);
}

function onMainFieldChange(evt){
    var val = $(this).val();
    
    if(val.indexOf(DOMAIN_NAME + "#") == 0){
        var hash = getHashFromLink(val);
        
        if(hash && (window.location.hash == "" || (window.location.hash.slice(1, window.location.hash.length) != hash))){
            HASH_CHANGED = true;
            window.location.hash = hash;
        }
        
        var qrUrl =  DOMAIN_NAME + "#" + hash;
        
        generateQrCode(qrUrl);
        
        if(MODE != "decrypt"){
            MODE = "decrypt";
            $("#output").val('').trigger("propertychange");
            prepareViews();
        }
    }else{
        if(MODE != "encrypt"){
            MODE = "encrypt";
            HASH_CHANGED = true;
            window.location.hash = "";
            $("#output").val('').trigger("propertychange");
            $("#download").attr("disabled", "disabled");
            prepareViews();
        }
    }
}

function prepareBasedOnLocation(){
    var hash = getHashFromLink(window.location.toString());
    
    $("#input").val(DOMAIN_NAME + "#" + hash);
    
    
    if(MODE != "decrypt"){
        MODE = "decrypt";
        $("#output").val('').trigger("propertychange");
        prepareViews();
    }
    
    $("#input").trigger("propertychange");
}

function generateQrCode(url){
    $("#qrcode").html('');
    var qrcode = new QRCode(document.getElementById("qrcode"), {
        text: url,
        width: 300,
        height: 300,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.Q
    });
}

$(function(){
    autosize($("#input"));
    autosize($("#output"));
    
    $("#password").hideablePassword();
    
    $("#input").on("input propertychange", onMainFieldChange);
    
    $("#input").on("input propertychange", onFiledsChange);
    $("#passField").on("input propertychange", onFiledsChange);
    
    $("#output").on("input propertychange", function(evt){
        var length = $("#output").val().length;
        
        if(length > 0){
            $("#toClipboard").removeAttr("disabled");
        }else{
            $("#toClipboard").attr("disabled", "disabled");
        }
        
        if(MODE == "encrypt"){
            if(length > 0){
                $("#download").removeAttr("disabled");
            }else{
                $("#download").attr("disabled", "disabled");
            }
        }
    })
    
    $("#passField").keypress(function(evt){
        if(evt.which == 13){
            evt.preventDefault();
            $(this).blur();
            
            $("#generate").click();
        }
    });
    
    $("#generate").click(function(evt){
        evt.preventDefault();
        
        if($(this).attr("disabled")){
            return;
        }
        
        if(MODE == "encrypt"){
            var passwordText = $("#password").hideablePassword("get");
            var messageText = $("#input").val();
            
            var enc = sjcl.json.decode(sjcl.encrypt(passwordText, messageText, {iter: 10000, ks: 256, ts: 64}));
            
            /* SJCL Bit Array Magic below :) */
            var version = [1 << 24]; 
            version = sjcl.bitArray.clamp(version, 8);
                
            var data = sjcl.bitArray.concat(version, enc.iv);
            data = sjcl.bitArray.concat(data, enc.salt);
            data = sjcl.bitArray.concat(data, enc.ct);

            enc = sjcl.codec.base64.fromBits(data);

            var url = DOMAIN_NAME;
            
            url = url + "#" + enc;
            
            generateQrCode(url);

            $("#output").val(url).trigger("propertychange");
            $("#output").data("hash", enc);
            $("#follow").attr("href", url);
            $("#download").show();
            $("#result").css('display', 'flex');
            
            try{
                setSelectionRange($("#output")[0], 0, url.length)
            }catch(e){

            }
            
            autosize.update($("#output"));
            return;
        }
        
        var data = document.location.hash.slice(1);

        try{
            data = sjcl.codec.base64.toBits(data);
        }catch(e){
            alertify.alert("Error: wrong password or broken link");
            return;
        }

        if (data.length <= 6){
            alertify.alert("Error: wrong password or broken link");
            return;
        }
        
        /* SJCL Bit Array Magic below :) */
        var version = sjcl.bitArray.bitSlice(data, 0, 8);
        version = version >> 24;
        
        if(version != 1){
            alertify.alert("Error: unsupported message version");
            return;
        }
        
        var iv   = sjcl.bitArray.bitSlice(data, 8, 8 + 128);
        var salt = sjcl.bitArray.bitSlice(data, 8 + 128, 8 + 128 + 64);
        var ct   = sjcl.bitArray.bitSlice(data, 8 + 128 + 64);

        var pack = {
            iv: iv,
            v: 1,
            iter: 10000,
            ks: 256,
            ts: 64,
            mode: "ccm",
            adata: "",
            cipher: "aes",
            salt: salt,
            ct: ct
        };
        
        var passwd = $("#password").hideablePassword("get");
        
        if (!passwd){
            alertify.alert("Error: empty password");
            return;
        }

        try{
            var msg = sjcl.decrypt(passwd, sjcl.json.encode(pack));
            $("#output").val(msg).trigger("propertychange");
            autosize.update($("#output"));
        }catch(error){
            if(error.message == "ccm: tag doesn't match"){
                alertify.alert("Error: wrong password or broken link");
                return;
            }
            alertify.alert("Error: wrong password or broken link");
        }
    });
    
    $("#howIt").click(function(evt){
        evt.preventDefault();
        
        alertify.alert($("#pageDescription").html());
    })
    
    new Clipboard("#toClipboard");
    
    $(window).on('popstate', function(){
        if(HASH_CHANGED){
            HASH_CHANGED = false;
            return;
        }
        
        prepareBasedOnLocation();
    });
    

    $("#newMessage").click(function(evt){
        evt.preventDefault();
        
        $("#input").val('');
        $("#password").hideablePassword("set", "");
        $("#output").val('').trigger("propertychange");
        
        if(window.location.hash != ""){
            HASH_CHANGED = true;
            window.location.hash = "";
        }
        
        if(MODE != "encrypt"){
            MODE = "encrypt";
            $("#download").attr("disabled", "disabled");
            $("#reply").attr("disabled", "disabled");
            prepareViews();
        }
        
        $("#input").focus();
    });
    
    $("#reply").click(function(evt){
        evt.preventDefault();
        
        $("#input").val('');
        $("#output").val('').trigger("propertychange");
        
        if(window.location.hash != ""){
            HASH_CHANGED = true;
            window.location.hash = "";
        }
        
        if(MODE != "encrypt"){
            MODE = "encrypt";
            $("#download").attr("disabled", "disabled");
            prepareViews();
        }
        
        $("#input").focus();
    });
    
    $("#download").click(function(evt){
        evt.preventDefault();
        
        if($(this).attr("disabled")){
            return;
        }
        
        var c = document.getElementById("canvas")
        var ctx = c.getContext("2d");
        
        ctx.beginPath();
        ctx.rect(0, 0, 330, 330);
        ctx.fillStyle = "white";
        ctx.fill();
        
        var img = new Image();
        img.src = $("#qrcode img").attr("src");
        ctx.drawImage(img, 15, 15)
        
        var url = c.toDataURL("image/png");
        
        download(url, "QRCode.png", "image/png");
        
    });
    
    if(window.location.hash != ""){
        prepareBasedOnLocation();
        $("#passField").focus();
    }else{
        $("#input").focus();
    }
    
    prepareViews();
});
