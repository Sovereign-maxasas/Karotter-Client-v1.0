// ==UserScript==
// @name         Karotter Client v1.0
// @namespace    https://github.com/Sovereign-maxasas
// @version      1.0.0
// @description  Keyboard shortcuts for Karotter
// @author       Sc
// @match        https://karotter.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let currentPost = null;


    // カーソルを合わせた投稿を記憶
    document.addEventListener("mouseover", (e) => {

        const post = e.target.closest(".flex.gap-2\\.5");

        if (post) {
            currentPost = post;
        }

    });



    document.addEventListener("keydown", (e) => {

        const active = document.activeElement;

        // 入力中は無効
        if (
            active &&
            (
                active.tagName === "INPUT" ||
                active.tagName === "TEXTAREA" ||
                active.isContentEditable
            )
        ) return;


        const key = e.key.toLowerCase();



        // ======================
        // メニュー移動
        // ======================

        const menu = {
            "1": "ホーム",
            "2": "検索",
            "3": "通知",
            "4": "メッセージ",
            "5": "ブックマーク",
            "6": "コミュニティ",
            "7": "プロフィール"
        };


        if (menu[key]) {

            const target = [...document.querySelectorAll("span")]
                .find(span => span.textContent.trim() === menu[key]);

            if (target) {
                e.preventDefault();
                target.closest("a,button")?.click();
            }

            return;
        }



        // ======================
        // TL更新 D
        // ======================

        if (key === "d") {

            const refresh = [...document.querySelectorAll("button")]
                .find(btn => btn.querySelector(".lucide-refresh-cw"));

            if (refresh) {
                e.preventDefault();
                refresh.click();
            }

        }



        // ======================
        // カロート N
        // ======================

        if (key === "n") {

            const karotter = [...document.querySelectorAll("button")]
                .find(btn => btn.textContent.includes("カロート"));

            if (karotter) {
                e.preventDefault();
                karotter.click();
            }

        }



        // 投稿が必要な操作
        if (!currentPost) return;



        // ======================
        // いいね E
        // ======================

        if (key === "e") {

            const like = currentPost
                .querySelector(".lucide-heart")
                ?.closest("button");

            if (like) {
                e.preventDefault();
                like.click();
            }

        }



        // ======================
        // リカロート R
        // ======================

        if (key === "r") {

            const repost = currentPost
                .querySelector(".lucide-repeat2")
                ?.closest("button");

            if (repost) {
                e.preventDefault();
                repost.click();
            }

        }



        // ======================
        // リプライ S
        // ======================

        if (key === "s") {

            const reply = currentPost
                .querySelector(".lucide-message-circle")
                ?.closest("button");

            if (reply) {
                e.preventDefault();
                reply.click();
            }

        }



        // ======================
        // 引用RK W
        // ======================

        if (key === "w") {

            const quote = [...document.querySelectorAll("button")]
                .find(btn => btn.textContent.includes("引用RK"));

            if (quote) {
                e.preventDefault();
                quote.click();
            }

        }

    });




    // ======================
    // ショートカット表示
    // ======================

    const panel = document.createElement("div");


    panel.innerHTML = `
<b>Karotter Shortcuts</b><br>
1：ホーム 🏠<br>
2：検索 🔍<br>
3：通知 🔔<br>
4：メッセージ 💬<br>
5：ブックマーク 🔖<br>
6：コミュニティ 👥<br>
7：プロフィール 👤<br>
D：TL更新 🔄<br>
E：いいね ❤️<br>
R：リカロート 🔁<br>
W：引用RK 📝<br>
S：リプライ 💬<br>
N：カロート ➕

<br>
Created by 
<a href="https://karotter.com/profile/Sc"
target="_blank"
style="color:#3b82f6;text-decoration:none;font-weight:bold;">
@Sc
</a>
`;



    panel.style.position = "fixed";
    panel.style.right = "20px";
    panel.style.bottom = "20px";
    panel.style.padding = "12px";
    panel.style.background = "rgba(0,0,0,0.75)";
    panel.style.color = "white";
    panel.style.borderRadius = "10px";
    panel.style.fontSize = "14px";
    panel.style.zIndex = "99999";
    panel.style.lineHeight = "1.6";


    document.body.appendChild(panel);


})();
