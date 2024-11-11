// todo
import "./style.css";

function alertButFunct() {
  alert("you clicked the button");
}

const alertButton = document.createElement("button");
alertButton.innerHTML = "ALERT";
alertButton.addEventListener("click", alertButFunct);
