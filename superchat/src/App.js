import React, { useRef, useState } from "react";
import "./App.css";

import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";
import "firebase/analytics";

import { useAuthState } from "react-firebase-hooks/auth";
import { useCollectionData } from "react-firebase-hooks/firestore";
import NodeRSA from "node-rsa";

// * Public Key Encryption
const key = new NodeRSA().generateKeyPair();
// ! Public and Private Keys
const publicK = key.exportKey("public");
const privateK = key.exportKey("private");

if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: "AIzaSyAgWk841PhP6VqchPrY09XDITupcMJdBek",
    authDomain: "proyecto-2-cifrado.firebaseapp.com",
    databaseURL: "https://proyecto-2-cifrado.firebaseio.com",
    projectId: "proyecto-2-cifrado",
    storageBucket: "proyecto-2-cifrado.appspot.com",
    messagingSenderId: "226943710305",
    appId: "1:226943710305:web:dc4db39f569f44fc722620",
  });
}
const auth = firebase.auth();
const firestore = firebase.firestore();
// const analytics = firebase.analytics();

function App() {
  const [user] = useAuthState(auth);

  return (
    <div className="App">
      <header className="App-header">
        <h1>⚛️🔥💬</h1>
        <SignOut />
      </header>
      <section>{user ? <ChatRoom /> : <SignIn />}</section>
    </div>
  );
}

function SignIn() {
  const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
  };

  return (
    <div className="login">
      <button className="sign-in" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
      <p>
        Do not violate the community guidelines or you will be banned for life!
      </p>
    </div>
  );
}

function SignOut() {
  return (
    auth.currentUser && (
      <button className="sign-out" onClick={() => auth.signOut()}>
        Sign Out
      </button>
    )
  );
}

function ChatRoom() {
  const dummy = useRef();
  const messagesRef = firestore.collection("messages");
  const query = messagesRef.orderBy("createdAt").limit(25);

  const [messages] = useCollectionData(query, { idField: "id" });

  const [formValue, setFormValue] = useState("");

  const sendMessage = async (e) => {
    e.preventDefault();

    const { uid, photoURL } = auth.currentUser;

    // * Encrypt msg
    const privateKey = new NodeRSA();
    privateKey.importKey(privateK);

    const encryptedMsg = privateKey.encryptPrivate(formValue, "base64");

    // * Send message request
    await messagesRef.add({
      text: encryptedMsg,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid,
      public_key: publicK,
      photoURL,
    });

    setFormValue("");
    dummy.current.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <main>
        {messages &&
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}

        <span ref={dummy}></span>
      </main>

      <form onSubmit={sendMessage}>
        <input
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder="say something nice"
        />

        <button type="submit" disabled={!formValue}>
          🕊️
        </button>
      </form>
    </>
  );
}

const decryptText = ({ text, public_key }) => {
  const publicKey = new NodeRSA();
  publicKey.importKey(public_key);
  try {
    const decrypted = publicKey.decryptPublic(text, "utf8");
    return decrypted;
  } catch {
    return null;
  }
};

function ChatMessage(props) {
  const { text, uid, photoURL, public_key } = props.message;

  const chatText = public_key ? decryptText({ text, public_key }) : text;

  const messageClass = uid === auth.currentUser.uid ? "sent" : "received";

  const errorClass = chatText ? "" : "error";

  return (
    <>
      <div className={`message ${messageClass} ${errorClass}`}>
        <img
          src={
            photoURL || "https://api.adorable.io/avatars/23/abott@adorable.png"
          }
          alt=""
        />
        <p>{chatText ? chatText : "El mensaje ha sido corrompido."}</p>
      </div>
    </>
  );
}

export default App;
