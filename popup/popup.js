let stopDeletion = false;

// XML 응답을 HTML에 표시하고 id 값을 저장하는 함수
function displayXmlResponse(xml) {
  const articles = xml.getElementsByTagName("article");
  const ids = Array.from(articles).map((article) => article.getAttribute("id"));
  document.getElementById("response-data").textContent = "삭제를 진행중입니다.";

  // id 값을 Chrome storage에 저장
  chrome.storage.local.set({ articleIds: ids }, () => {
    console.log("Article IDs saved:", ids);
  });

  return ids;
}

// XML 응답에서 is_mine="1"인 댓글 id 값을 저장하는 함수
function extractCommentIds(xml) {
  const comments = xml.getElementsByTagName("comment");
  const ids = Array.from(comments)
    .filter((comment) => comment.getAttribute("is_mine") === "1")
    .map((comment) => comment.getAttribute("id"));

  return ids;
}

// 글 삭제 요청을 반복적으로 보내는 함수
function sendPostAndDeleteArticles() {
  stopDeletion = false; // 초기화

  chrome.storage.local.get("everytimeCookies", (data) => {
    const cookies = data.everytimeCookies || [];
    const cookieString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    function postAndDelete() {
      if (stopDeletion) {
        document.getElementById("response-data").textContent =
          "삭제 작업이 중단되었습니다.";
        return;
      }

      fetch("https://api.everytime.kr/find/board/article/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieString,
        },
        body: new URLSearchParams({
          id: "myarticle",
        }).toString(),
      })
        .then((response) => response.text())
        .then((str) => {
          const parser = new DOMParser();
          const xml = parser.parseFromString(str, "application/xml");
          const ids = displayXmlResponse(xml);

          if (ids.length === 0) {
            stopDeletion = true;
            document.getElementById("response-data").textContent =
              "삭제할 게시글이 없습니다.";
            return;
          }

          // 각 id에 대해 삭제 요청을 보냄
          ids.forEach((id) => {
            fetch("https://api.everytime.kr/remove/board/article", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: cookieString,
              },
              body: new URLSearchParams({
                id: id,
              }).toString(),
            })
              .then((response) => response.text())
              .then((str) => {})
              .catch((error) => {});
          });

          // 다음 반복을 위해 재귀 호출
          setTimeout(postAndDelete, 1000); // 1초 대기 후 다음 요청
        })
        .catch((error) => {
          console.error("Error:", error);
          document.getElementById("response-data").textContent =
            "Error: " + error;
        });
    }

    // 첫 번째 호출
    postAndDelete();
  });
}

// 댓글 삭제 요청을 반복적으로 보내는 함수
function sendPostAndDeleteComments() {
  stopDeletion = false; // 초기화

  chrome.storage.local.get("everytimeCookies", (data) => {
    const cookies = data.everytimeCookies || [];
    const cookieString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    function postAndDelete() {
      if (stopDeletion) {
        document.getElementById("response-data").textContent =
          "삭제 작업이 중단되었습니다.";
        return;
      }

      // 첫 번째 요청: 게시글 목록 가져오기
      fetch("https://api.everytime.kr/find/board/article/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieString,
        },
        body: new URLSearchParams({
          id: "mycommentarticle",
        }).toString(),
      })
        .then((response) => response.text())
        .then((str) => {
          const parser = new DOMParser();
          const xml = parser.parseFromString(str, "application/xml");
          const articleIds = displayXmlResponse(xml);

          if (articleIds.length === 0) {
            stopDeletion = true;
            document.getElementById("response-data").textContent =
              "삭제할 댓글이 없습니다.";
            return;
          }

          // 두 번째 요청: 각 게시글의 댓글 목록 가져오기
          articleIds.forEach((articleId, index) => {
            setTimeout(() => {
              fetch("https://api.everytime.kr/find/board/comment/list", {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Cookie: cookieString,
                },
                body: new URLSearchParams({
                  id: articleId,
                }).toString(),
              })
                .then((response) => response.text())
                .then((str) => {
                  const parser = new DOMParser();
                  const xml = parser.parseFromString(str, "application/xml");
                  const commentIds = extractCommentIds(xml);

                  if (commentIds.length === 0) {
                    return;
                  }

                  // 세 번째 요청: 각 댓글 삭제
                  commentIds.forEach((commentId, index) => {
                    setTimeout(() => {
                      fetch("https://api.everytime.kr/remove/board/comment", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/x-www-form-urlencoded",
                          Cookie: cookieString,
                        },
                        body: new URLSearchParams({
                          id: commentId,
                        }).toString(),
                      })
                        .then((response) => response.text())
                        .then((str) => {})
                        .catch((error) => {});
                    }, index * 300); // 0.3초 대기 후 다음 요청
                  });

                  // 다음 반복을 위해 재귀 호출
                  setTimeout(postAndDelete, 500); // 0.5초 대기 후 다음 요청
                })
                .catch((error) => {
                  console.error("Error:", error);
                  document.getElementById("response-data").textContent =
                    "Error: " + error;
                });
            }, index * 500); // 0.5초 대기 후 다음 요청
          });
        })
        .catch((error) => {
          console.error("Error:", error);
          document.getElementById("response-data").textContent =
            "Error: " + error;
        });
    }

    // 첫 번째 호출
    postAndDelete();
  });
}

// 버튼 클릭 이벤트 리스너 추가
document
  .getElementById("send-request")
  .addEventListener("click", sendPostAndDeleteArticles);

document
  .getElementById("send-comment-request")
  .addEventListener("click", sendPostAndDeleteComments);

document.getElementById("stop-deletion").addEventListener("click", () => {
  stopDeletion = true;
});
