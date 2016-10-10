
(function($) {
    var tooltips = {
        show: "Click to reveal password",
        hide: "Hide password"
    };
    
    var passwords = {};

    function prepare(elem){
        var button = elem.find("a");
        var eye = button.find("svg");
        var eyeUse = eye.find("use");
        var input = elem.find("input");
        
        elem.addClass("hideablePassword")
        
        passwords[elem.attr("id")] = "";
        
        var focus = false;
        
        input.focus(function(evt){
            focus = true;
            input.attr("type", "password");
            input.val(passwords[elem.attr("id")]);
        });
        
        input.focusout(function(evt){
            focus = false;
            input.attr("type", "text");
            passwords[elem.attr("id")] = input.val();
            
            input.val(new Array(passwords[elem.attr("id")].length + 1).join("•"));
        })
        
        input.on("input propertychange", function(){
            if(focus){
                passwords[elem.attr("id")] = input.val();
            }
        });
        
        eye.removeClass("icon-eye").addClass("icon-eye-slash");
        eyeUse.attr("xlink:href", "#icon-eye-slash");
        input.attr("type", "text");
        button.attr("title", tooltips.show);
        
        button.off("click").click(function(evt){
            evt.preventDefault();
            
            if(eye.hasClass("icon-eye-slash")){
                input.attr("type", "text");
                input.val(passwords[elem.attr("id")]);
                eye.removeClass("icon-eye-slash").addClass("icon-eye");
                eyeUse.attr("xlink:href", "#icon-eye");
                button.attr("title", tooltips.hide);
                return;
            }
        
            input.attr("type", "password");
            passwords[elem.attr("id")] = input.val();
            input.val(new Array(passwords[elem.attr("id")].length + 1).join("•"));
            eye.removeClass("icon-eye").addClass("icon-eye-slash");
            eyeUse.attr("xlink:href", "#icon-eye-slash");
            button.attr("title", tooltips.show);
        });
        
        elem.find(".eyeholder").css("display", "inline-block");
    }

    $.fn.hideablePassword = function(options){
        
        if(typeof options === "string"){
            if(options == "get"){
                return passwords[$(this).attr("id")];
            }else if(options == "set"){
                var elem = $(this);
                passwords[elem.attr("id")] = arguments[1];
                
                var input = elem.find("input");
                input.val(new Array(passwords[elem.attr("id")].length + 1).join("•"));
            }
            return;
        }else{
            return this.each(function(){
                prepare($(this));
            });
        }
    }

}(jQuery));
