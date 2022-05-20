// ==UserScript==
// @name         bilibili港澳台番剧替换弹幕
// @namespace    https://github.com/LuffyLSX/bilibili_danmaku_replace
// @version      1.0
// @description  点击按钮后，输入想要替换的番剧的网址、Epid、SeasonId其中一种即可替换弹幕
// @author       LuffyLSX
// @match        https://www.bilibili.com/bangumi/*
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    let css = `
        .danmu-replace {
            margin: 0px 0px 0px 28px;
            position: relative;
            display: block;
            float: left;
            height: 36px;
            cursor: pointer;
        }

        .danmu-svg {
            width: 28px;
            height: 28px;
            display: inline-block;
            fill: #757575;
        } 

        .danmu-span {
            display: inline-block;
            vertical-align: top;
            height: 28px;
            line-height: 28px;
            font-size: 14px;
            color: #505050;margin-left: 5px;
        } `
    
    function getBangumiData(Epid_or_Ssid = window.location.href){
        $.ajaxSettings.async = false;
        var bangumi_data = {}
        var BangumiInfo_url = 'https://bangumi.bilibili.com/view/web_api/season'
        var get_data = {
            ep_id:/ep([0-9]+)/.exec(Epid_or_Ssid) == null ? 0 : /ep([0-9]+)/.exec(Epid_or_Ssid)[1],
            season_id:/ss([0-9]+)/.exec(Epid_or_Ssid) == null ? 0 : /ss([0-9]+)/.exec(Epid_or_Ssid)[1],
        }
        ep_item = document.getElementsByClassName('ep-item cursor visited')
        $.get(BangumiInfo_url, get_data, function(data){
            //bangumi_data.ep_watch = 1
            bangumi_data.ep_watch = (ep_item.length == 0) ? 1 : /[0-9]+/.exec(ep_item[0].innerText)[0]
            bangumi_data.ep_id = data['result']['episodes'][bangumi_data.ep_watch - 1]['ep_id']
            bangumi_data.season_id = data['result']['season_id']
            bangumi_data.title = data['result']['title'].replace(/（.+）/, '')
            bangumi_data.aid = data['result']['episodes'][bangumi_data.ep_watch - 1]['aid']
            bangumi_data.cid = data['result']['episodes'][bangumi_data.ep_watch - 1]['cid']
            bangumi_data.mid = data['result']['episodes'][bangumi_data.ep_watch - 1]['mid'] 
        },"json")
        $.ajaxSettings.async = true;
        return bangumi_data
    }

    //合并arraybuff
    function concatenate(arrays){
        let totalLen = 0;
        for (let arr of arrays)
            totalLen += arr.byteLength;
        let res = new Uint8Array(totalLen)
        let offset = 0
        for (let arr of arrays) {
            let uint8Arr = new Uint8Array(arr)
            res.set(uint8Arr, offset)
            offset += arr.byteLength
        }
        return res.buffer
    }

    function inputDanmaku(protobuf){
        ah.proxy({
            onRequest: (config, handler) => {
                handler.next(config);
            },
            //请求发生错误时进入，比如超时；注意，不包括http状态码错误，如404仍然会认为请求成功
            onError: (err, handler) => {
                handler.next(err)
            },
            //请求成功后进入
            onResponse: (response, handler) => {
                var DanmuProtobufUrl = /api\.bilibili\.com\/x\/v2\/dm\/web\/seg\.so.+/
                if (DanmuProtobufUrl.test(response.config.url)) {
                    if (protobuf) {
                        response.response = protobuf;
                        protobuf = undefined;
                        ah.unProxy()
                    }
                }
                handler.next(response)
            }
        })
        window.player.reload()
    }

    var danmuProtobuf = new Array()
    function getDanmukuProtobuf(cid = 714449041,n = 1){
        url = "https://api.bilibili.com/x/v2/dm/web/seg.so?type=1&oid=" + cid +"&segment_index=" + n
        var xhr = new XMLHttpRequest()
        xhr.responseType = "arraybuffer"
        xhr.onreadystatechange = function(){
        // 通信成功时，状态值为4
        if (xhr.readyState === 4){
            if (xhr.status === 200){
            console.log(xhr.response)
            //var message = dmList.decode(xhr.response)
            danmuProtobuf.push(xhr.response)
            console.log(xhr.response)
            getDanmukuProtobuf(cid,n + 1)
            } else {
            console.log('弹幕获取完成')
            inputDanmaku(concatenate(danmuProtobuf))
            }
        }
        }
        xhr.onerror = function (e) {
        console.error(xhr.statusText)
        }
        xhr.open('GET', url, true) //只能异步,同步不能为'arraybuffer'
        xhr.send(null)
        return 1
    }

    function replace(){
        var text = prompt("请输入要替换番剧网址：")
        var EpSsid = /[eps]+([0-9]+)/.exec(text) == null? 0 : /[eps]+([0-9]+)/.exec(text)[0]
        if(EpSsid == 0){
            alert('非法输入')
            return
        }
        var Target = getBangumiData(EpSsid)
        getDanmukuProtobuf(Target.cid)
    }
    
    function insert_danmu(){
        let danmu = document.createElement('div')
        danmu.className = "danmu-replace"
        danmu.innerHTML = `
        <div class="danmu-svg">
            <svg viewBox="0 0 28 28">
                        <use xlink:href="#bpx-svg-sprite-dantype-scroll"></use>
                    </svg>
            </div>
        <span class="danmu-span">替换弹幕</span>
        `
        document.getElementById('toolbar_module').insertBefore(danmu,document.getElementsByClassName('watch-toast-wrp')[0])
        let styleNode = document.createElement("style");
        styleNode.className = 'css'
        styleNode.appendChild(document.createTextNode(css));
        //(document.querySelector("head") || document.documentElement).appendChild(styleNode);
        document.documentElement.appendChild(styleNode);
    
        danmu.addEventListener('click',function(){replace()})
        danmu.addEventListener("mouseover", function(){document.getElementsByClassName('danmu-span')[0].style.color = '#23ADE5'})
        danmu.addEventListener("mouseout", function(){document.getElementsByClassName('danmu-span')[0].style.color = ''})
    
        danmu.addEventListener("mouseover", function(){document.getElementsByClassName('danmu-svg')[0].style.fill = '#23ADE5'})
        danmu.addEventListener("mouseout", function(){document.getElementsByClassName('danmu-svg')[0].style.fill = ''})
    }

    var id = setTimeout(function(){
        var toolbar = document.querySelector('.main-container')
        if(toolbar){
            insert_danmu()
            clearInterval(id)
        }}, 300)

})();