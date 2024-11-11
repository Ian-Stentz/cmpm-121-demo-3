// todo
import "./style.css";

const APP_NAME = "Ian's Geocoin";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
app.innerHTML = APP_NAME;

function alertButFunct() {
  alert("you clicked the button");
}

const alertButton = document.createElement("button");
alertButton.innerHTML = "ALERT";
alertButton.addEventListener("click", alertButFunct);
app.append(alertButton);
