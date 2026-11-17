(() => {
  const socket = io();
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const joinCode = params.get("join");
  const isPhone = !!joinCode;
  let roomCode = null, pc = null, localStream = null, peerReady = false;
  const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
  if (window.PHONECAST_TURN) iceServers.push(window.PHONECAST_TURN);

  function toast(msg) {
    const el = $("toast"); if (!el) return;
    el.textContent = msg; el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2600);
  }
  function status(msg, online=false) {
    if ($("statusText")) $("statusText").textContent = msg;
    if ($("statusDot")) $("statusDot").classList.toggle("online", online);
  }
  function makePeer() {
    if (pc) pc.close();
    pc = new RTCPeerConnection({ iceServers });
    pc.onicecandidate = e => { if (e.candidate) socket.emit("ice-candidate", e.candidate); };
    pc.onconnectionstatechange = () => {
      if (!isPhone) status(pc.connectionState === "connected" ? "Đã kết nối — đang trình chiếu" : "Trạng thái: " + pc.connectionState, pc.connectionState === "connected");
    };
    pc.ontrack = e => {
      const video = $("remoteVideo");
      video.srcObject = e.streams[0];
      $("display").classList.add("live");
      $("placeholder").style.display = "none";
      status("Đã nhận hình ảnh từ điện thoại", true);
      video.play().catch(()=>{});
    };
    return pc;
  }
  socket.on("peer-joined", async () => {
    peerReady = true;
    status("Điện thoại đã tham gia — sẵn sàng nhận màn hình", true);
    if (isPhone && localStream) await renegotiate();
  });
  socket.on("offer", async offer => {
    if (!pc) makePeer();
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", answer);
  });
  socket.on("answer", async answer => {
    if (pc && pc.signalingState !== "stable") await pc.setRemoteDescription(answer);
  });
  socket.on("ice-candidate", async candidate => {
    try { if (pc && candidate) await pc.addIceCandidate(candidate); } catch(e) { console.warn(e); }
  });
  socket.on("peer-left", () => {
    status("Thiết bị kia đã ngắt kết nối", false);
    if (!isPhone) { $("display").classList.remove("live"); $("placeholder").style.display="flex"; $("remoteVideo").srcObject=null; }
  });

  async function renegotiate() {
    if (!pc || !peerReady) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", offer);
  }

  if (isPhone) {
    $("phoneView").classList.remove("hidden");
    $("phoneCode").textContent = joinCode;
    socket.emit("join-room", { code: joinCode }, result => {
      if (!result.ok) { $("phoneMessage").textContent = result.error; return; }
      $("phoneMessage").textContent = "Đã kết nối với máy tính. Bạn có thể bắt đầu chia sẻ.";
      $("startShare").disabled = false;
      peerReady = true;
      makePeer();
    });
    $("startShare").addEventListener("click", async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          throw new Error("Trình duyệt Android này chưa hỗ trợ chia sẻ màn hình từ website. Hãy thử Chrome mới nhất; nếu vẫn không được, cần dùng ứng dụng chia sẻ màn hình.");
        }
        localStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
          track.onended = () => { socket.emit("stop-sharing"); toast("Đã dừng chia sẻ màn hình."); };
        });
        await renegotiate();
        $("startShare").textContent = "Đang chia sẻ màn hình";
        $("startShare").disabled = true;
        $("phoneMessage").textContent = "Đang truyền màn hình. Không đóng trang này.";
      } catch (err) {
        toast(err.message || "Không thể bắt đầu chia sẻ.");
      }
    });
    $("leaveRoom").addEventListener("click", () => {
      if (localStream) localStream.getTracks().forEach(t=>t.stop());
      socket.disconnect(); location.href = "/";
    });
  } else {
    socket.emit("create-room", result => {
      roomCode = result.code;
      $("roomCode").textContent = roomCode;
      const link = `${location.origin}/?join=${roomCode}`;
      if (window.QRCode) new QRCode($("qrcode"), { text: link, width: 108, height: 108, correctLevel: QRCode.CorrectLevel.M });
      status("Đã tạo phòng — chờ điện thoại quét mã");
      $("copyLink").addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(link); toast("Đã sao chép liên kết ghép nối."); }
        catch { toast(link); }
      });
    });
    $("fullscreenBtn").addEventListener("click", () => {
      const target = $("display");
      if (target.requestFullscreen) target.requestFullscreen();
    });
  }
})();