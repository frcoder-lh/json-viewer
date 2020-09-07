var tree;
var setting = {
    encodeType: "utf-8", expandLevel: 0,
    view: {
        txtSelectedEnable: true, nameIsHTML: true, showTitle: false
    },
    callback: {
        onRightClick: zTreeOnRightClick
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


$('#in').bind('input propertychange', function () {
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
            if (inJson[key] instanceof Object) {
                let item = createNode('[' + key + ']', []);
                parseJson(inJson[key], item);
                outJson.children.push(item);
            } else {
                outJson.children.push(createNode(key, inJson[key]));
            }
        } else if (inJson[key] instanceof Object) {
            let item = createNode(key, []);
            parseJson(inJson[key], item);
            outJson.children.push(item);
        } else {
            outJson.children.push(createNode(key, inJson[key]));
        }
    }
}

function getOutJson() {
    let inJson = getInJson();
    if (!inJson) return null;

    let outJson = createNode("JSON", []);
    parseJson(inJson, outJson);
    return outJson;
}

function createNode(key, value, encodeFlag, quoteFlag) {
    if (encodeFlag == true || encodeFlag == null) key = htmlEncode(key);
    if (value instanceof Array) {
        return {originalKey: key, originalValue: value, name: '<span class="name">' + key + '</span> ', children: value};
    } else {
        if (typeof value === 'string' && (quoteFlag == true || quoteFlag == null)) value = '"' + value + '"';
        if (encodeFlag == true || encodeFlag == null) value = htmlEncode(value);
        return {originalKey: key, originalValue: value, name: '<span class="name">' + key + '</span>: ' + value};
    }
}

function htmlEncode(value) {
    return $('<div/>').text(value).html();
}

function htmlDecode(value) {
    return $('<div/>').html(value).text();
}

(function fuzzySearch() {

    function ztreeFilter(zTreeObj, _keywords) {
        if (!_keywords) {
            _keywords = "";
        }

        function filterFunc(node) {
            if (node && node.oldname && node.oldname.length > 0) {
                node.name = node.oldname;
            }
            zTreeObj.updateNode(node);
            if (_keywords.length == 0) {
                zTreeObj.showNode(node);
                zTreeObj.expandNode(node, true);
                return true;
            }
            if (node.name) {
                let show = false;
                let rexGlobal = new RegExp(_keywords, "gi");
                let originalKey = node.originalKey.replace(rexGlobal, function (originalText) {
                    show = true;
                    return '<span class="searchTarget">' + originalText + '</span>';
                });
                let originalValue = node.originalValue;
                if (!(node.originalValue instanceof Array)) {
                    originalValue = node.originalValue.replace(rexGlobal, function (originalText) {
                        show = true;
                        return '<span class="searchTarget">' + originalText + '</span>';
                    });
                }
                node.oldname = node.name;
                if (show) {
                    node.name = createNode(originalKey, originalValue, false, false).name;
                    zTreeObj.updateNode(node);
                    zTreeObj.showNode(node);
                    return true;
                }
            }
            zTreeObj.hideNode(node);
            return false;
        }

        var nodesShow = zTreeObj.getNodesByFilter(filterFunc);
        processShowNodes(nodesShow, _keywords);
    }

    function processShowNodes(nodesShow, _keywords) {
        if (nodesShow && nodesShow.length > 0) {
            if (_keywords.length > 0) {
                $.each(nodesShow, function (n, obj) {
                    var pathOfOne = obj.getPath();
                    if (pathOfOne && pathOfOne.length > 0) {
                        for (var i = 0; i < pathOfOne.length - 1; i++) {
                            tree.showNode(pathOfOne[i]);
                            tree.expandNode(pathOfOne[i], true);
                        }
                    }
                });
            } else {
                var rootNodes = tree.getNodesByParam("level", "0");
                $.each(rootNodes, function (n, obj) {
                    tree.expandNode(obj, true);
                });
            }
        }
    }

    var lastKeyword = "";
    $("#fuzzySearch").bind("input propertychange", function () {
        if (!tree) return;
        var _keywords = $(this).val();
        if (lastKeyword === _keywords) {
            return;
        }
        lastKeyword = _keywords;
        searchNodeLazy(_keywords);
    });

    var timeoutId = null;

    function searchNodeLazy(_keywords) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(function () {
            ztreeFilter(tree, _keywords);
        }, 500);
    }
})();

(function gotoTop() {

    $("#gotoTop").click(function () {
        $('html,body').animate({scrollTop: '0px'}, 'normal');
    });

    function showGotoTop() {
        var s = $(window).scrollTop();
        if (s > 50) {
            $("#gotoTop").fadeIn(500);
        } else {
            $("#gotoTop").fadeOut(500);
        }
        ;
    }

    $(window).scroll(showGotoTop);
    $("#container").resize(showGotoTop);
    $(window).resize(function () {
        $("#gotoTop").offset({left: $("#middle").offset().left - 19.5});
        showGotoTop();
    });
    $(window).resize();

})();

function zTreeOnRightClick(event, treeId, treeNode) {
    if (treeNode.isParent) return;
    $("#modalTitle").html(treeNode.getPath().map(a => a.originalKey).join(" > "));
    $("#modalContent").html(treeNode.originalValue);
    $("#detailModal").css('display', 'flex');
};

$(".modal-dialog ").click(function (e) {
    e.stopPropagation();
});
$("#detailModal").click(function () {
    $("#detailModal").hide();
});