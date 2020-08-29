var tree;
var setting = {
    encodeType: "utf-8", expandLevel: 0,
    view: {
        txtSelectedEnable: true, nameIsHTML: true, showTitle: false
    }
};

document.body.addEventListener("drop", function (e) {
    e.preventDefault();
    openFile(e.dataTransfer.files[0]);
}, false);

$('#in').focus(function () {
    $(".tip").hide();
});

$('#in').blur(function () {
    if (!$('#in').text()) {
        $(".tip").show();
    }
});


$('#in').bind('input propertychange DOMNodeInserted', function () {
    $(".tip").hide();
    $.fn.zTree.init($("#out"), setting, getOutJson());
    tree = $.fn.zTree.getZTreeObj("out");
    $('#expandAll').click();
});

$('#format').bind('click', function () {
    $("#in").text(JSON.stringify(getInJson(), null, "  "));
});

$('#compress').bind('click', function () {
    $("#in").text(JSON.stringify(getInJson()));
});

$('#zcompress').bind('click', function () {
    $("#in").text(JSON.stringify(JSON.stringify(getInJson())));
});

$('#expandLevel').bind('click', function () {
    if (!tree) return;

    let nodes = tree.getNodesByFilter(node => node.level == setting.expandLevel);
    if (nodes.length == 0) return;

    if (nodes.map(node => tree.expandNode(node, true, false, false, true)).some(e => e != null)) {
        setting.expandLevel++;
    }
});

$('#collapseLevel').bind('click', function () {
    if (!tree) return;

    let nodes = tree.getNodesByFilter(node => node.level == setting.expandLevel - 1);
    if (nodes.length == 0) return;

    setting.expandLevel--;
    nodes.forEach(node => tree.expandNode(node, false, false, false, true));
});

$('#expandAll').bind('click', function () {
    if (!tree) return;
    let nodes = tree.getNodesByFilter(node => {
        if (node.level > setting.expandLevel) setting.expandLevel = node.level;
        return node.isParent;
    });
    nodes.forEach(node => tree.expandNode(node, true, false, false, true));
});

$('#collapseAll').bind('click', function () {
    if (!tree) return;
    let nodes = tree.getNodesByFilter(node => node.isParent);
    nodes.forEach(node => tree.expandNode(node, false, false, false, true));
    setting.expandLevel = 0;
});


function openFile(file) {
    if (file == undefined) return;
    var reader = new FileReader();
    reader.onload = function () {
        var content = this.result.toString();
        if (content.indexOf('�') != -1) {
            if (confirm("文件编码错误，将进行自动修正。")) {
                switchEncode();
                alert("修正完毕，请重新上传！");
                return;
            }
        }
        $('#in').text(content);
    };
    reader.readAsText(file, setting.encodeType);
}

function switchEncode() {
    setting.encodeType = setting.encodeType === "utf-8" ? "gbk" : "utf-8";
}

function getInJson() {
    let zNodes;
    var text = $('#in').text();
    text = text.replace(/(^[\s'"]*)|([\s'"]*$)/g, "");
    try {
        try {
            try {
                zNodes = eval(text);
            } catch (e) {
                zNodes = eval(eval('"' + text + '"'))
            }
        } catch (e) {
            zNodes = JSON.parse($('#in').text())
        }
    } catch (e) {
        console.warn("JSON格式错误");
    }
    return zNodes;
}

function parseJson(inJson, outJson) {
    for (let key in inJson) {
        if (inJson instanceof Array) {
            let item = {name: '<span class="name">[' + key + ']</span>', children: []};
            parseJson(inJson[key], item);
            outJson.children.push(item);
        } else if (inJson[key] instanceof Object) {
            let item = {name: '<span class="name">' + key + '</span>', children: []};
            parseJson(inJson[key], item);
            outJson.children.push(item);
        } else if (typeof(inJson[key]) === 'string') {
            outJson.children.push({name: '<span class="name">' + key + '</span>: "' + inJson[key] + '"'});
        } else {
            outJson.children.push({name: '<span class="name">' + key + '</span>: ' + inJson[key]});
        }
    }
}

function getOutJson() {
    let inJson = getInJson();
    if (!inJson) return null;

    let outJson = {name: "JSON", children: []};
    parseJson(inJson, outJson);
    return outJson;
}