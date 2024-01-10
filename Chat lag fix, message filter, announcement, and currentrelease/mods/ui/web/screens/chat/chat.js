/** 
 * Chat Filter
 * Add permanently filtered usernames and words here.
 * 
 * Please note that if a username contains a filtered
 * word, it will be filtered as well.
 * 
 * Values are NOT case sensitive.
 * 
 * Syntax: see https://www.w3schools.com/js/js_arrays.asp
 */
var filteredNames = [];
var filteredWords = [];

var isTeamChat = false;
var stayOpen = false;
var hideTimer;
var hideDelay = 4500;
var fadeTime = 800;
var nameCardOpacity = 0.8;
var teamArray = [
    {name: 'red', color: '#620B0B'},
    {name: 'blue', color: '#0B2362'},
    {name: 'green', color: '#1F3602'},
    {name: 'orange', color: '#BC4D00'},
    {name: 'purple', color: '#1D1052'},
    {name: 'gold', color: '#A77708'},   
    {name: 'brown', color: '#1C0D02'}, 
    {name: 'pink', color: '#FF4D8A'}, 
    {name: 'white', color: '#D8D8D8'}, 
    {name: 'black', color: '#0B0B0B'}           
];
var playerName;
var pageWidth, pageHeight;
var basePage = {
    width: 1280,
    height: 720,
    scale: 1,
    scaleX: 1,
    scaleY: 1
};
var playerTabIndex = -1;
var playersMatchList = [];
var settingsArray = { 'Game.HideChat': '0', 'Player.Name': '0'};
var filterEnabled = true;

var cachedPlayerJSON;

$(function(){
    var $page = $('.page_content');

    getPageSize();
    scalePages($page, pageWidth, pageHeight);
  
    $(window).resize(function() {
        getPageSize();            
        scalePages($page, pageWidth, pageHeight);
    });
  
    function getPageSize() {
        pageHeight = $('#container').height();
        pageWidth = $('#container').width();
    }

    function scalePages(page, maxWidth, maxHeight) {            
        var scaleX = 1, scaleY = 1;                      
        scaleX = maxWidth / basePage.width;
        scaleY = maxHeight / basePage.height;
        basePage.scaleX = scaleX;
        basePage.scaleY = scaleY;
        basePage.scale = (scaleX > scaleY) ? scaleY : scaleX;
        page.attr('style', '-webkit-transform:scale(' + basePage.scale + ');');
    }
});

$(document).ready(function(){
    $(document).keyup(function (e) {
        if (e.keyCode === 27) {
            chatboxHide();
        }
        if (e.keyCode == 44) {
            dew.command('Game.TakeScreenshot');  
        }
    });
    $(document).keydown(function(e){
        if (e.keyCode === 13){ //Enter
            dew.sendChat($("#chatBox").val(), isTeamChat);
            $("#chatBox").val("");
            chatboxHide();
        }else{
            $("#chatBox").focus();
        }
    });
    
    $("#chatBox").keydown(function(e){
        if(e.keyCode === 33) {
            $("#chatWindow").scrollTop($("#chatWindow").scrollTop()-($('#chatWindow p').height() * 6));   
        }
        if(e.keyCode === 34) {
            $("#chatWindow").scrollTop($("#chatWindow").scrollTop()+($('#chatWindow p').height() * 6));        
        }
    });
	
	$("html").on("keydown", function(e){ //disable tabbing
		if(e.keyCode == 9){ //tab
			e.preventDefault();
		}
	});

    $("body").click(function(){
        $("#chatBox").focus();
    });
    
    $("#chatBox").keyup(function (e) {
        var wordArray = $("#chatBox").val().split(' ');
        if (e.keyCode == 9) { //tab
            if (playerTabIndex == -1) {
                if (wordArray[wordArray.length - 1] != '' && wordArray[wordArray.length - 1].startsWith('@')) {
                    playersMatchList = [];
                    $.each(JSON.parse(cachedPlayerJSON), function (index, obj) {
                        if (JSON.parse(cachedPlayerJSON)[index].name.toLowerCase().startsWith(wordArray[wordArray.length - 1].substring(1).toLowerCase())) {
                            playersMatchList.push(JSON.parse(cachedPlayerJSON)[index].name);
                        }
                    });
                    playerTabIndex = 0;
                    wordArray.splice(wordArray.length - 1, 1);
                    wordArray.push('@' + playersMatchList[playerTabIndex]);
                    $("#chatBox").val(wordArray.join(' '));
                }
            } else {
                playerTabIndex++;
                if (playerTabIndex > playersMatchList.length - 1)
                    playerTabIndex = 0;
                wordArray.splice(wordArray.length - 1, 1);
                wordArray.push('@' + playersMatchList[playerTabIndex]);
                $("#chatBox").val(wordArray.join(' '));
            }
        } else {
            playerTabIndex = -1;
        }
    });

    $('#filter-toggle').change(function () {
        if (this.checked) {
            $('.filtered').css('display', '');
            filterEnabled = true;
        } else {
            $('.filtered').css('display', 'block');
            filterEnabled = false;
        }
    })
    
    loadSettings(0);
});

function loadSettings(i){
	if (i != Object.keys(settingsArray).length) {
		dew.command(Object.keys(settingsArray)[i], {}).then(function(response) {
			settingsArray[Object.keys(settingsArray)[i]] = response;
			i++;
			loadSettings(i);
		});
	}
}

dew.on("show", function(e){
    if(settingsArray['Game.HideChat'] == 0){
        playerName = new RegExp("@"+settingsArray['Player.Name'], "ig");
        clearTimeout(hideTimer);
        if(e.data.hasOwnProperty('teamChat')){
            isTeamChat = e.data.teamChat;
        }
        dew.getSessionInfo().then(function(i){
            if(i.established){
                if(isTeamChat && !i.hasTeams){
                    isTeamChat = false;
                } 
                $("#chat").stop();
                $("#chat").show(true, true);
                $('body').removeClass();
                if(i.mapName != "mainmenu"){
                    $("body").addClass("inGame");
                }else{
                    $("body").addClass("inLobby");
                }
                if(isTeamChat && i.hasTeams){
                    $("#chatBox").attr("placeholder", "TEAM");
                }else{
                    $("#chatBox").attr("placeholder", "GLOBAL");
                }
                if(!stayOpen){
                    dew.captureInput(e.data.captureInput);
                    if (e.data.captureInput) {
                        stayOpen = true;
                        $("#chatBox").show(0, "linear", function(){
                            $("#chatBox").focus();
                            $("#chatWindow").css("bottom", "26px");
                            $("#chatWindow").removeClass("hide-scrollbar");
                            $('.filter-toggle-wrapper').show();
                        });
                        dew.command('Server.ListPlayersJSON', {}).then(function (e) {
                            cachedPlayerJSON = e;
                        });
                    }else{
                        $("#chatBox").hide();
                        $("#chatWindow").css("bottom", "0");
                        $("#chatWindow").addClass("hide-scrollbar");
                        $('.filter-toggle-wrapper').hide();
                        fadeAway();
                    }
                }
                if($("#chatWindow p").length){
                    $("#chatWindow p").last()[0].scrollIntoView(false);
                }
            }else{
                dew.hide();
            }
        });
    }
});

dew.on("chat", function(e){
    if(e.data.hasOwnProperty('color')){
        var bgColor =  e.data.color;
        if (e.data.hasTeams){
            if(e.data.hasOwnProperty('teamIndex')){
                bgColor = teamArray[e.data.teamIndex].color;
            }
        }
        bgColor = hexToRgba(adjustColor(bgColor,20), nameCardOpacity);
    }
    var messageClass = 'nameCard';
    var chatClass = e.data.chatType;
    if((e.data.message).match(playerName) && playerName != undefined){
        chatClass += ' mention';                
    }
    
    if(e.data.message.startsWith('/me ')){
        messageClass += ' emote';
        chatClass += ' emote';
        e.data.message = e.data.message.substring(4, e.data.message.length);
    }

    e.data.message =  e.data.message.substring(0, Math.min(128,  e.data.message.length));

    var messageFiltered = isFiltered(e.data.sender, e.data.message);
    if (messageFiltered) {
        chatClass += ' filtered';
    }
    
    var messageHtml = escapeHtml(e.data.message).replace(/\bhttps?:\/\/[^ ]+/ig, aWrap);
    var newElement = $("#chatWindow").append($('<span>', { 
        class: messageClass, 
        css: { backgroundColor: bgColor}, 
        text: e.data.sender 
    })
    .wrap($('<p>', { class: chatClass })).parent().append(messageHtml));

    var p = newElement.find('p').last();
    if (!filterEnabled && p.hasClass('filtered')) {
        p.css('display', 'block');
    }
    
    if(settingsArray['Game.HideChat'] == 0 && (!messageFiltered || !filterEnabled)){
        dew.show();
    }
    
    $("a").on("click",function(e){				
        e.preventDefault();
        dew.show('alert', {
            icon: 0,
            title: "Warning",
            body: "This link goes to " + this.href + " Are you sure you want to open this?",
            url: this.href,
            type: "url"
        });
    });
});

dew.on('controllerinput', function(e){       
    if(e.data.B == 1){
        chatboxHide();  
    }
});

dew.on("variable_update", function(e){
    for(i = 0; i < e.data.length; i++){
        if(e.data[i].name in settingsArray){
            settingsArray[e.data[i].name] = e.data[i].value;
        }
    }
});

dew.on('mute-text', function(e){
    var name = e.data.name;
    var shouldMute = e.data.shouldMute;

    return shouldMute ? addFilteredName(name) : removeFilteredName(name);
});

function fadeAway(){
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function(){
        $("#chat").fadeOut(fadeTime, function(){
            dew.hide();
        });
    }, hideDelay);
}

function chatboxHide(){
    dew.captureInput(false);
    fadeAway();
    stayOpen = false;
    $("#chatBox").val('');
    $("#chatBox").hide();
    $("#chatWindow").css("bottom", "0");
    $("#chatWindow").addClass("hide-scrollbar");
    $('.filter-toggle-wrapper').hide();
}

function hexToRgba(hex,opacity){
    var r = parseInt(hex.substr(1,2), 16);
    var g = parseInt(hex.substr(3,2), 16);
    var b = parseInt(hex.substr(5,2), 16);
    return 'rgba('+ r + "," + g + "," + b + "," + opacity+")";
}

function aWrap(link) {
    link = unescapeHtml(link);
   if(/\b[^-A-Za-z0-9+&@#/%?=~_|!:,.;\(\)]+/ig.test(link))
        return '';
    var e = document.createElement('a');
    e.setAttribute('href', link);
    e.setAttribute('target', '_blank');
    e.setAttribute('style', 'color:dodgerblue');
    e.textContent = link;
    return e.outerHTML;
};

function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function unescapeHtml(str) {
    var e = document.createElement('div');
    e.innerHTML = str;
    return e.childNodes.str === 0 ? "" : e.childNodes[0].nodeValue;
}

function adjustColor(color, amount){
    var colorhex = (color.split("#")[1]).match(/.{2}/g);
    for (var i = 0; i < 3; i++){
        var e = parseInt(colorhex[i], 16);
        e += amount;
        if(amount > 0){
            colorhex[i] = ((e > 255) ? 255 : e).toString(16);
        }else{
            colorhex[i] = ((e < 0) ? 0 : e).toString(16);           
        }
    }
    return "#" + colorhex[0] + colorhex[1] + colorhex[2];
}

function isFiltered(author, message) {
    if (filteredNames.includes(author.toLowerCase())) {
        return true;
    }

    const fullMessage = (author + message).toLowerCase();
    return filteredWords.filter(word => fullMessage.includes(word)).length > 0;
}

function addFilteredName(name) {
    name = name.toLowerCase();

    if (!filteredNames.includes(name)) {
        filteredNames.push(name);

        $('#chatWindow p').find('span').each(function () {
            var $this = $(this);
    
            if ($this.text().toLowerCase() === name) {
                $this.parent().addClass('filtered');
            }
        });
    }
}

function removeFilteredName(name) {
    name = name.toLowerCase();
    var index = filteredNames.indexOf(name);

    if (index > -1) {
        filteredNames.splice(index, 1);

        $('#chatWindow p').find('span').each(function () {
            var $this = $(this);
    
            if ($this.text().toLowerCase() === name) {
                $this.parent().removeClass('filtered');
            }
        });
    }
}

dew.on("chat", function(e){
  // OTHER STUFF    

  if ( $("#chatWindow").children().length > 50) {
    $("#chatWindow").children()[0].remove();
  }
    
})