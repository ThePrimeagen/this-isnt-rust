/* @refresh reload */
import { createSignal, onCleanup } from "solid-js";
import { render, For } from 'solid-js/web';

import './index.css';

enum Mode {
    Pen15 = 0,
    CountGiveaway = 1,
}

const SAY_COMMAND = "ThePrimeagen:!say";

type Data = Map<string, number>;
const [msgs, setMessages] = createSignal<string[]>([]);
const data = new Map<string, number>();
const [count, setCount] = createSignal<number>(0);
const [winner, setWinner] = createSignal<string>("There is no winner");
const [mode, setMode] = createSignal<Mode>(Mode.Pen15);

const ws = new WebSocket("ws://127.0.0.1:8080")

ws.addEventListener("open", function() {
    console.log("we open babye");
});

ws.addEventListener("close", function() {
    console.log("we closed");
});

ws.addEventListener("error", function(e) {
    console.log("we error", e);
});

ws.addEventListener("message", function(m) {
    const msg = m.data as string;
    if (msg.startsWith("ThePrimeagen:!say")) {
    }
    setMessages([msg, ...msgs()]);
});

// because js devs intuitively know js sucks , but haven't realized it
// consciously. they keep chasing better by making new frameworks but it's an
// endless cycle
const Message = ({msg}: {msg: string}) => {
    const [name, ...rest] = msg.split(":");
    const message = rest.join(":").toLowerCase();

    let color = "transparent";
    if (message.includes("pen15")) {
        setCount(count() + 1);
        let user_count = data.get(name);
        if (!user_count) {
            user_count = 0;
        }
        data.set(name, user_count + 1);

        color = "#a85332";
    }

    return <div style={`padding: 2px; background-color: ${color}`}>
        {name}: {message}
    </div>;
};

const Messages = ({mode, msgs}: {mode: () => Mode, msgs: () => string[]}) => {
    console.log("message constructor", mode, msgs, Mode.Pen15, Mode.CountGiveaway);
    if (mode() === Mode.Pen15) {
        return <For each={msgs()}>
        {
            (msg, _) => {
                return <Message msg={msg} />
            }
        }
        </For>
    }
    return <div> Other Mode! </div>
}

function startTheCount() {
    setMode(Mode.CountGiveaway);
}

console.log("message constructor", mode(), msgs(), Mode.Pen15);
const CountingComponent = () => {
    return <div>
        <button onClick={async () => {
            startTheCount();
        }}> Counting Contest </button>

        <button onClick={() => {
            const all_possible = new Array(count()).fill("");
            let offset = 0;
            for (const [name, value] of data.entries()) {
                for (let i = 0; i < value; ++offset, ++i) {
                    all_possible[offset] = name;
                }
            }

            const rand = Math.floor(Math.random() * count());
            setWinner(all_possible[rand]);

        }}> Run Contest </button>

        <div>
            Current contest entries are: {count()}
        </div>
        <div>
            The winner is: {winner()}
        </div>

        <ul>
            <Messages mode={() => mode()} msgs={() => msgs()} />
        </ul>
    </div>;
};

render(() => <CountingComponent />, document.getElementById("root")!);

