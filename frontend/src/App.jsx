import React, { useEffect, useRef, useState } from "react"
import { CopyToClipboard } from "react-copy-to-clipboard"
import Peer from "simple-peer"
import io from "socket.io-client"
import "./App.css"


const socket = io.connect('http://localhost:5000')
const App=()=> {
	const [ me, setMe ] = useState("")
  const [hideForm, setHideForm] = useState(false)
  const [chats, setChats] = useState([])
  const [msg, setmsg] = useState("")
  const [room, setRoom] = useState("")
	const [ stream, setStream ] = useState()
	const [ receivingCall, setReceivingCall ] = useState(false)
	const [ caller, setCaller ] = useState("")
	const [ callerSignal, setCallerSignal ] = useState()
	const [ callAccepted, setCallAccepted ] = useState(false)
	const [ idToCall, setIdToCall ] = useState("")
	const [ callEnded, setCallEnded] = useState(false)
	const [ name, setName ] = useState("")
	const myVideo = useRef()
	const userVideo = useRef()
	const connectionRef= useRef()
useEffect(() => {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
    setStream(stream);
    if (myVideo.current) {
      myVideo.current.srcObject = stream;
    }
  });
}, [myVideo])

  useEffect(() => {
   

    socket.on("me", (id) => {
      setMe(id);
      console.log("My ID:", id);
    });

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
      console.log("Incoming call from:", data.from);
      if(idToCall===""){
        setIdToCall(data.from)
      }
    });
   
    socket.on("msg",(data)=>{
      
      if (data.id !== me) {
        console.log(data)
        setChats(()=>[...chats, data]);
        
      }
    })
  }, []);
useEffect(() => {
  console.log(chats);
}, [chats])

  const callUser = (id) => {
    console.log("Calling user ID:", id);
    if(name===''){
      return alert("Please fill your name")
    }
    setHideForm(true)
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    });

    peer.on("signal", (data) => {
      console.log("Sending signal data to callUser:", data);
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name
      });
    });

    peer.on("stream", (stream) => {
      console.log("Received remote stream:", stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });

    socket.on("callAccepted", (signal) => {
      console.log("Call accepted. Incoming signal:", signal);
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  }

	const answerCall = () => {
    setCallAccepted(true);
    setHideForm(true)
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    });
  
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });
  
    peer.on("stream", (stream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });
  
    peer.signal(callerSignal);
    connectionRef.current = peer;
  }
  

	const leaveCall = () => {
    
    setCallEnded(true);
  
    // Close the local stream and tracks
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  
    // Close the remote stream
    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }
  
    // Close the connectionRef
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
  };

  const handleSendMsg = () => {
    socket.emit('msg1', { id: me,to:idToCall, text: msg,});
    setChats([...chats,{ id: me,to:idToCall, text: msg }])
    setmsg(""); // Clear the input field after sending the message
  };
  
  

	return (
    <>
      <h1 style={{ textAlign: "center", color: "#fff" }}>Assignment</h1>
      <div className="container">
        <div className="video-container">
          <div className="video">
            {<video playsInline muted ref={myVideo} autoPlay style={{ width: "50%" }} />}
          </div>
          <div className="video">
            {callAccepted && !callEnded ? (
              <video playsInline ref={userVideo} autoPlay style={{ width: "50%" }} />
            ) : null}
          </div>
          <div>
          {receivingCall && !callAccepted ? (
            <div className="caller">
              <h1>{name} is calling...</h1>
              <button onClick={answerCall}>Answer</button>
            </div>
          ) : null}
        </div>
        </div>
        {
          hideForm && 
        <div className="chatBox">
          <div className="content">
            <ul>
              {
                chats.map((item,idx)=>(
                  <div key={idx} className="msg" style={{float:item.id==me?"right":"left"}}>
                    <div className="username">{item.id==me? "me":"other"}</div>
                   
                    <div className="msgtext">{item.text}</div>
                  </div>
                ))
              }
            </ul>
          </div>
          <div className="operations">
          <input type="text" value={msg} onChange={(e)=>setmsg(e.target.value)}/>
            <button onClick={handleSendMsg}>send chat</button>
          </div>
        </div>
        }


        {
          !hideForm &&
        <div className="myId">
				<input
					id="filled-basic"
					placeholder="Name"
					variant="filled"
          
					value={name}
					onChange={(e) => setName(e.target.value)}
					style={{ marginBottom: "20px" }}
				/>
				<CopyToClipboard text={me} style={{ marginBottom: "2rem" }}>
					<button >
						Copy ID
					</button>
				</CopyToClipboard>

				<input
					id="filled-basic"
					placeholder="ID to call"
					variant="filled"
					value={idToCall}
					onChange={(e) => setIdToCall(e.target.value)}
				/>
				<div className="call-button">
					{callAccepted && !callEnded ? (
						<button  onClick={leaveCall}>
							End Call
						</button>
            
            
					) : (
						<button onClick={() => callUser(idToCall)}>
							call
						</button>
					)}
					{idToCall}
				</div>
			</div>
        }
        
      </div>
    </>
  );
}

export default App