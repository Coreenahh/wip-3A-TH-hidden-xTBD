
const { h, render } = preact;
const { useState, useEffect, useRef } = preactHooks;

/* ------------------ Config ------------------ */

const SELF_ID = "adm1";
const AI_CHANNEL_NAME = "Helper AI";

/* ------------------ Utilities ------------------ */

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nowTime() {
    const d = new Date();
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
}

/* ------------------ Toasts ------------------ */

function useToasts() {
    const [toasts, setToasts] = useState([]); // {id,text,variant}
    const idRef = useRef(0);

    function addToast(text, variant = "warning", ttl = 2500) {
        const id = ++idRef.current;
        setToasts((prev) => [...prev, { id, text, variant }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, ttl);
    }

    return { toasts, addToast };
}

function Toasts({ toasts }) {
    return (
        <div
            className="toasts"
            role="region"
            aria-live="polite"
            style={{
                position: "fixed",
                right: "16px",
                bottom: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                zIndex: 9999
            }}
        >
            {toasts.map((t, i) => (
                <div
                    key={t.id}
                    className={`pad toast toast--${t.variant}`}
                    style={{
                        minWidth: "240px",
                        maxWidth: "360px",
                        transform: `translateY(-${i * 2}px)`
                    }}
                >
                    <div className="pad__body">
                        <span className="text-paragraph1">{t.text}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ------------------ App ------------------ */

function App() {
    // top / channel selection
    const [activeTop, setActiveTop] = useState(null);
    const [activeChannel, setActiveChannel] = useState(null);

    // messages per channel name
    const [messagesByChannel, setMessagesByChannel] = useState({});

    // Helper AI state machine
    const [aiStep, setAiStep] = useState(0);               // 0..3 = intro steps, then question
    const [aiAwaitingAnswer, setAiAwaitingAnswer] = useState(false);
    const [aiSolved, setAiSolved] = useState(false);
    const [aiTyping, setAiTyping] = useState(false);

    // timers (allow multiple pending AI timers)
    const aiTimersRef = useRef([]);

    const { toasts, addToast } = useToasts();

    const showAccessDenied = activeTop && activeTop !== "Messages";

    /* ---------- Seed messages per channel on first open ---------- */
    function ensureChannelSeed(name) {
        if (!name) return;
        setMessagesByChannel((prev) => {
            if (prev[name]) return prev;
            return { ...prev, [name]: getMessagesFor(name) };
        });
    }

    function clearAllAiTimers() {
        aiTimersRef.current.forEach((id) => clearTimeout(id));
        aiTimersRef.current = [];
    }

    function aiSetTimer(cb, delayMs) {
        const id = setTimeout(() => {
            // remove id from list when it fires
            aiTimersRef.current = aiTimersRef.current.filter((x) => x !== id);
            cb();
        }, delayMs);
        aiTimersRef.current.push(id);
        return id;
    }

    // safety: stop any pending AI actions on unmount
    useEffect(() => {
        return () => clearAllAiTimers();
    }, []);

    // also stop typing + timers on channel switch
    useEffect(() => {
        clearAllAiTimers();
        setAiTyping(false);
    }, [activeChannel?.name]);

    // selecting a feed/direct sets Messages tab active
    function selectChannel(ch) {
        clearAllAiTimers();
        setActiveTop("Messages");
        setActiveChannel(ch);
        ensureChannelSeed(ch?.name);

        if (ch?.name === AI_CHANNEL_NAME) {
            // comment these out if you want progress to persist across visits
            setAiStep(0);
            setAiAwaitingAnswer(false);
            setAiSolved(false);
        } else {
            setAiTyping(false);
        }
    }

    /* ---------- Helper AI speaking ---------- */

    function aiSay(channelName, text, minDelay = 1600, maxDelay = 2600) {
        if (activeChannel?.name !== channelName) return; // safety if user switched
        setAiTyping(true);
        const delay = rand(minDelay, maxDelay);
        aiSetTimer(() => {
            if (activeChannel?.name !== channelName) return; // safety
            const aiMsg = {
                id: `ai-${Date.now()}`,
                content: text,
                time: nowTime(),
                author: { id: "ai", name: AI_CHANNEL_NAME }
            };
            setMessagesByChannel((prev) => ({
                ...prev,
                [channelName]: [...(prev[channelName] || []), aiMsg]
            }));
            // If no more timers queued, stop typing
            if (aiTimersRef.current.length === 0) {
                setAiTyping(false);
            }
        }, delay);
    }

    function matchesGoodBoyAnswer(raw) {
        const s = (raw || "").toLowerCase().trim();
        if (/^me+!?$/.test(s)) return true;                // me, mee, meee, me!
        if (/^(i\s*am|i['’]?m)\b/.test(s)) return true;    // i am, i'm, im
        if (s.includes("good boy")) return true;
        if (s.startsWith("me ") || /^it'?s me\b/.test(s)) return true;
        return false;
    }


    /* ---------- Send handler ---------- */

    function handleSend(text) {
        const channelName = activeChannel?.name;
        if (!channelName) return;

        // non-AI channels: blocked
        if (channelName !== AI_CHANNEL_NAME) {
            addToast("Messaging is disabled in this channel.", "warning");
            return;
        }

        // append user message
        const userMsg = {
            id: `self-${Date.now()}`,
            content: text,
            time: nowTime(),
            author: { id: SELF_ID, name: "Admin_1" }
        };
        setMessagesByChannel((prev) => ({
            ...prev,
            [channelName]: [...(prev[channelName] || []), userMsg]
        }));

        // already solved → dismissives forever
        if (aiSolved) {
            const dismissives = [
                "I'm tired of talking with you, Admin_1 impostor.",
                "Enough. Door’s closed.",
                "No more chat, faker.",
                "Silence mode: ON. Go away.",
                "Go away!! Leave me alone!!!",
                "Begone now, Admin_1 wannabe."
            ];
            aiSay(channelName, dismissives[rand(0, dismissives.length - 1)], 700, 1300);
            return;
        }

        // awaiting the answer to the question
        if (aiAwaitingAnswer) {
            if (matchesGoodBoyAnswer(text)) {
                aiSay(
                    channelName,
                    `Yes! Yes, you are, cutie! Good boy. Here's what you were looking for:
                    <button class="dubious-btn" onclick="window.location.href='index-2.html'"><span>(nghh harder 🤤)</span><span>(dubious button)</span></button>`,
                    700,
                    1400
                );


                setAiAwaitingAnswer(false);
                setAiSolved(true);
            } else {
                aiSay(channelName, "Not good enough. Again.", 600, 1200);
            }
            return;
        }

        // scripted intro sequence until we ask the question
        switch (aiStep) {
            case 0:
                aiSay(channelName, "Processing your request...", 600, 1200);
                setAiStep(1);
                break;
            case 1:
                aiSay(
                    channelName,
                    "Jk, I just like making dramatic pauses. Anyways, if what you need is to find the way further, beg for it.",
                    1600,
                    2600
                );
                setAiStep(2);
                break;
            case 2:
                aiSay(
                    channelName,
                    "Also... I know you're not Admin_1. She tends to ignore me.",
                    1600,
                    2600
                );
                setAiStep(3);
                break;
            case 3:
                // two messages: preface then the actual question
                aiSay(
                    channelName,
                    "Yeah, yeah, keep your human babbling short. You just need to answer one question to move on further...",
                    1600,
                    2600
                );
                // schedule the actual question shortly after
                aiSetTimer(() => {
                    aiSay(channelName, "...who's a good boy? ( ͡° ͜ʖ ͡°)", 1600, 2800);
                    setAiAwaitingAnswer(true);
                }, 2100);
                setAiStep(4);
                break;
            default:
                // user keeps talking without answering
                aiSay(channelName, "Answer the question.", 600, 1100);
                break;
        }
    }

    /* ---------- Current messages ---------- */

    const currentMessages = activeChannel?.name
        ? messagesByChannel[activeChannel.name] || []
        : [];

    /* ---------- Render ---------- */

    return (
        <div className="app-skeleton">
            <header className="app-header">
                <div className="app-header__anchor">
                    <span className="app-header__anchor__text">Admin Dashboard</span>
                </div>
                <nav>
                    <ul className="nav">
                        {FIXTURES.headerMenu.map((navItem, i) => (
                            <HeaderNavItem
                                key={i}
                                navItem={navItem}
                                isActive={activeTop === "Messages" && navItem.text === "Messages"}
                                onClick={() => setActiveTop(navItem.text)}
                            />
                        ))}
                    </ul>
                </nav>
                <div />
            </header>

            {showAccessDenied && (
                <div className="pad" style={{ margin: "1rem", textAlign: "center" }}>
                    <div className="pad__body">
                        <TextHeading3 $as="h2">Error 403 Forbidden ):</TextHeading3>
                        <TextParagraph1>Data currently unavailable. Please try again later.</TextParagraph1>
                    </div>
                </div>
            )}

            <div className="app-container">
                <div className="app-a">
                    <div className="segment-topbar">
                        <div className="segment-topbar__header">
                            <TextHeading3 className="segment-topbar__title">Messages</TextHeading3>
                        </div>
                        <div className="segment-topbar__aside">
                            <div className="button-toolbar">
                                <a className="button button--primary button--size-lg">
                                    <IconFeedAdd className="button__icon" />
                                </a>
                            </div>
                        </div>
                    </div>

                    <form className="form-search" onSubmit={(e) => e.preventDefault()}>
                        <div className="form-group">
                            <div className="form-control form-control--with-addon">
                                <input name="query" placeholder="Search..." type="text" />
                                <div className="form-control__addon form-control__addon--prefix">
                                    <IconSearchSubmit />
                                </div>
                            </div>
                        </div>
                    </form>

                    <NavSection renderTitle={(props) => <h2 {...props}>Feeds</h2>}>
                        <ChannelNav
                            activeChannel={activeChannel}
                            channels={FIXTURES.feed}
                            onSelect={selectChannel}
                        />
                    </NavSection>

                    <NavSection renderTitle={(props) => <h2 {...props}>Direct</h2>}>
                        <ConversationNav
                            activeConversation={activeChannel}
                            conversations={FIXTURES.conversation}
                            onSelect={selectChannel}
                        />
                    </NavSection>
                </div>

                <div className="app-main">
                    {activeTop === "Messages" ? (
                        <ChannelView
                            activeChannel={activeChannel}
                            messages={currentMessages}
                            onSend={handleSend}
                            allowSend={activeChannel?.name === AI_CHANNEL_NAME}
                            aiTyping={aiTyping}
                        />
                    ) : (
                        !showAccessDenied && (
                            <div className="pad" style={{ margin: "2rem", textAlign: "center" }}>
                                <div className="pad__body">
                                    <TextParagraph1>Select a channel or conversation to start.</TextParagraph1>
                                </div>
                            </div>
                        )
                    )}
                </div>

                <div className="app-b">
                    <Pad>
                        <TextHeading3 $as="h4">Last activity.</TextHeading3>
                        <TextParagraph1>
                            &gt;The last <em>log-in attempt</em> was on <strong>2025-08-19</strong> at <em>13:46:39</em>.
                        </TextParagraph1>
                        <TextParagraph1>
                            &gt;If you are not <strong>Admin_1</strong>, please close this page and erase your memory via{" "}
                            <a
                                href="https://www.sigsauer.com/firearms/pistols/p226.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lethal-link"
                            >
                                <em>gunshot</em>
                            </a>
                            ,{" "}
                            <a
                                href="https://ecatalog.corning.com/life-sciences/b2c/US/en/Glassware/Specialty-Glass/Apparatus/PYREX%C2%AE-Cyanide-Distilling-Apparatus/p/3350-C"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lethal-link"
                            >
                                <em>cyanide</em>
                            </a>{" "}
                            or{" "}
                            <a
                                href="https://www.theknotsmanual.com/knots/hangmans-knot-noose/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lethal-link"
                            >
                                <em>other</em>
                            </a>{" "}
                            similar means.
                        </TextParagraph1>
                    </Pad>


                </div>
            </div>

            {/* bottom-right toasts */}
            <Toasts toasts={toasts} />
        </div>
    );
}

/* ------------------ Views ------------------ */

function ChannelView({ activeChannel, messages, onSend, allowSend, aiTyping }) {
    const title = activeChannel ? activeChannel.name : "—";
    const [draft, setDraft] = useState("");
    const bodyRef = useRef(null);

    const isNearBottom = () => {
        const el = bodyRef.current;
        if (!el) return true;
        const threshold = 24; 
        return el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
    };

    const scrollToBottom = () => {
        const el = bodyRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    };

    useEffect(() => {
        if (isNearBottom()) {
            scrollToBottom();
        }
    }, [messages.length, aiTyping]);

    useEffect(() => {

        const id = setTimeout(scrollToBottom, 0);
        return () => clearTimeout(id);
    }, [title]);


    function submit(e) {
        e.preventDefault();
        const txt = draft.trim();
        if (!txt) return;
        onSend(txt);
        requestAnimationFrame(scrollToBottom);
        setDraft("");
    }

    return (
        <div className="channel-feed">
            <div className="segment-topbar">
                <div className="segment-topbar__header">
                    <TextOverline className="segment-topbar__overline">
                        NetConn_Seed: d869db7fe62fb07c25a0403ecaea55031744b5fb
                    </TextOverline>
                    <TextHeading4 className="segment-topbar__title">
                        <ChannelLink name={title} />
                    </TextHeading4>
                </div>
                <div className="segment-topbar__aside">
                    <div className="button-toolbar">
                        <a className="button button--default"><IconFeedMute className="button__icon" /></a>
                        <a className="button button--default"><IconFeedSettings className="button__icon" /></a>
                        <a className="button button--default"><IconMenuMore className="button__icon" /></a>
                    </div>
                </div>
            </div>

            <div className="channel-feed__body" ref={bodyRef}>
                {messages.map((m) => (
                    <FeedMessage key={m.id} message={m} />
                ))}
                {aiTyping && (
                    <div className="message">
                        <div className="message__body">
                            <div>Helper AI is typing…</div>
                        </div>
                        <div className="message__footer">
                            <span className="message__authoring">Helper AI</span> - {nowTime()}
                        </div>
                    </div>
                )}
            </div>


            <div className="channel-feed__footer">
                <form className="channel-message-form" action="#" onSubmit={submit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="message">Message</label>
                        <div className="form-control">
                            <textarea
                                id="message"
                                className="form-control"
                                name="message"
                                value={draft}
                                onInput={(e) => setDraft(e.currentTarget.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        const txt = (draft || "").trim();
                                        if (!txt) return;
                                        onSend(txt);
                                        setDraft("");
                                        requestAnimationFrame(scrollToBottom);
                                    }
                                }}
                                placeholder={
                                    allowSend
                                        ? "Type to chat with Helper AI…"
                                        : "Messaging disabled in this channel"
                                }
                            />
                        </div>
                    </div>
                    <div className="form-footer">
                        <Button size="xl" type="submit" variant="primary">Send</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ------------------ Nav / UI ------------------ */

function NavSection({ children, renderTitle }) {
    return (
        <div className="nav-section">
            <div className="nav-section__header">
                {renderTitle({ className: "nav-section__title" })}
            </div>
            <div className="nav-section__body">{children}</div>
        </div>
    );
}

function HeaderNavItem({ navItem, isActive, onClick }) {
    return (
        <li className="nav__item">
            <a
                className={`nav__link ${isActive ? "nav__link--active" : ""}`}
                href="#"
                onClick={(e) => { e.preventDefault(); onClick && onClick(); }}
            >
                <span className="nav__link__element">{navItem.text}</span>
                {navItem.notificationCount > 0 && (
                    <span className="nav__link__element"><Badge>{navItem.notificationCount}</Badge></span>
                )}
            </a>
        </li>
    );
}

function ChannelNav({ activeChannel, channels, onSelect }) {
    return (
        <ul className="nav">
            {channels.map((channel) => (
                <li className="nav__item" key={channel.id}>
                    <a
                        className={`nav__link ${activeChannel && activeChannel.id === channel.id ? "nav__link--active" : ""
                            }`}
                        href="#"
                        onClick={(e) => { e.preventDefault(); onSelect(channel); }}
                    >
                        <ChannelLink {...channel} />
                    </a>
                </li>
            ))}
        </ul>
    );
}

function ConversationNav({ activeConversation, conversations, onSelect }) {
    return (
        <ul className="nav">
            {conversations.map((convo) => (
                <li className="nav__item" key={convo.id}>
                    <a
                        className={`nav__link ${activeConversation && activeConversation.id === convo.id ? "nav__link--active" : ""
                            }`}
                        href="#"
                        onClick={(e) => { e.preventDefault(); onSelect(convo); }}
                    >
                        <ConversationLink conversation={convo} />
                    </a>
                </li>
            ))}
        </ul>
    );
}

function ChannelLink({ name = "", unread = 0 }) {
    return (
        <span className={`channel-link ${unread > 0 ? "conversation-link--unread" : ""}`}>
            <span className="channel-link__icon">#</span>
            <span className="channel-link__element">{name || "Select a channel"}</span>
            {unread > 0 && (
                <span className="channel-link__element"><Badge>{unread}</Badge></span>
            )}
        </span>
    );
}

function ConversationLink({ conversation }) {
    return (
        <span
            className={`conversation-link ${conversation.isOnline ? "conversation-link--online" : ""
                } ${conversation.unread > 0 ? "conversation-link--unread" : ""}`}
        >
            <span className="conversation-link__icon" />
            <span className="conversation-link__element">{conversation.name}</span>
            {conversation.unread > 0 && (
                <span className="conversation-link__element"><Badge>{conversation.unread}</Badge></span>
            )}
        </span>
    );
}

function FeedMessage({ message }) {
    const isSelf = message.author.id === SELF_ID; // highlight Admin_1
    return (
        <div className={`message ${isSelf ? "message--self" : ""}`}>
            <div className="message__body">
                <div dangerouslySetInnerHTML={{ __html: message.content }} />
            </div>
            <div className="message__footer">
                <span className="message__authoring">{message.author.name}</span>
                {" - " + message.time}
            </div>
        </div>
    );
}


function Badge({ children }) {
    return <span className="badge">{children}</span>;
}

function Button({ children, type = "button", size = "default", variant = "default" }) {
    return (
        <button
            className={`button ${variant ? `button--${variant}` : ""} ${size ? `button--size-${size}` : ""}`}
            type={type}
        >
            <span className="button__content">{children}</span>
        </button>
    );
}

function Pad({ children }) {
    return (
        <div className="pad">
            <div className="pad__body">{children}</div>
        </div>
    );
}

/* ------------------ Typography helpers ------------------ */

function MakeTextBase(classNameDefault, $asDefault) {
    return ({ $as = null, children, className }) => {
        const AsComponent = $as || $asDefault;
        return <AsComponent className={`${classNameDefault} ${className || ""}`}>{children}</AsComponent>;
    };
}

const TextHeading1 = MakeTextBase("text-heading1", "h1");
const TextHeading2 = MakeTextBase("text-heading2", "h2");
const TextHeading3 = MakeTextBase("text-heading3", "h3");
const TextHeading4 = MakeTextBase("text-heading4", "h4");
const TextHeading5 = MakeTextBase("text-heading5", "h5");
const TextHeading6 = MakeTextBase("text-heading6", "h6");
const TextParagraph1 = MakeTextBase("text-paragraph1", "p");
const TextOverline = MakeTextBase("segment-topbar__overline", "span");

/* ------------------ Icons ------------------ */

function MakeIcon(svg) {
    return ({ className }) => (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            {svg}
        </svg>
    );
}

const IconFeedMute = MakeIcon(
    <path d="M18 9.5c2.481 0 4.5 1.571 4.5 3.503 0 1.674-1.703 3.48-4.454 3.48-.899 0-1.454-.156-2.281-.357-.584.358-.679.445-1.339.686.127-.646.101-.924.081-1.56-.583-.697-1.007-1.241-1.007-2.249 0-1.932 2.019-3.503 4.5-3.503zm0-1.5c-3.169 0-6 2.113-6 5.003 0 1.025.37 2.032 1.023 2.812.027.916-.511 2.228-.997 3.184 1.302-.234 3.15-.754 3.989-1.268.709.173 1.388.252 2.03.252 3.542 0 5.954-2.418 5.954-4.98.001-2.906-2.85-5.003-5.999-5.003zm-.668 6.5h-1.719v-.369l.938-1.361v-.008h-.869v-.512h1.618v.396l-.918 1.341v.008h.95v.505zm3.035 0h-2.392v-.505l1.306-1.784v-.011h-1.283v-.7h2.25v.538l-1.203 1.755v.012h1.322v.695zm-10.338 9.5c1.578 0 2.971-1.402 2.971-3h-6c0 1.598 1.45 3 3.029 3zm.918-7.655c-.615-1.001-.947-2.159-.947-3.342 0-3.018 2.197-5.589 5.261-6.571-.472-1.025-1.123-1.905-2.124-2.486-.644-.374-1.041-1.07-1.04-1.82v-.003c0-1.173-.939-2.123-2.097-2.123s-2.097.95-2.097 2.122v.003c.001.751-.396 1.446-1.041 1.82-4.667 2.712-1.985 11.715-6.862 13.306v1.749h9.782c.425-.834.931-1.764 1.165-2.655zm-.947-15.345c.552 0 1 .449 1 1 0 .552-.448 1-1 1s-1-.448-1-1c0-.551.448-1 1-1z" />
);

const IconFeedSettings = MakeIcon(
    <path d="M6 16h-6v-3h6v3zm-2-5v-10h-2v10h2zm-2 7v5h2v-5h-2zm13-7h-6v-3h6v3zm-2-5v-5h-2v5h2zm-2 7v10h2v-10h-2zm13 3h-6v-3h6v3zm-2-5v-10h-2v10h2zm-2 7v5h2v-5h-2z" />
);

const IconMenuMore = MakeIcon(
    <path d="M12 18c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0-9c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0-9c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z" />
);

const IconFeedAdd = MakeIcon(<path d="M24 10h-10v-10h-4v10h-10v4h10v10h4v-10h10z" />);

const IconSearchSubmit = MakeIcon(
    <path d="M21.172 24l-7.387-7.387c-1.388.874-3.024 1.387-4.785 1.387-4.971 0-9-4.029-9-9s4.029-9 9-9 9 4.029 9 9c0 1.761-.514 3.398-1.387 4.785l7.387 7.387-2.828 2.828zm-12.172-8c3.859 0 7-3.14 7-7s-3.141-7-7-7-7 3.14-7 7 3.141 7 7 7z" />
);

/* ------------------ Data / Seeds ------------------ */

const FIXTURES = {
    headerMenu: [
        { notificationCount: 0, text: "Home" },
        { isActive: false, notificationCount: 21, text: "Messages" },
        { notificationCount: 0, text: "Shop" },
        { notificationCount: 0, text: "Map" },
        { notificationCount: 0, text: "Files" }
    ],
    feed: [
        { id: "5ba5", name: "System Note", unread: 2 },
        { id: "4f22", name: "Operational logs", unread: 3 },
        { id: "dee3", name: "TEAM", isPrivate: true, unread: 8 }
    ],
    conversation: [
        { id: "cc23", isOnline: true, unread: 5, name: "Admin_2" },
        { id: "95b4", isOnline: true, name: "Editor_5", unread: 3 },
        { id: "10cf", name: "LT <3" },
        { id: "e466", name: "Helper AI" }
    ]
};

function getMessagesFor(channelName) {
    switch (channelName) {
        case "System Note":
            return [
                {
                    id: "sys1",
                    content: "System reboot scheduled at 03:00 AM. Expect downtime.",
                    time: "10:02 PM",
                    author: { id: "sys", name: "System" }
                },
                {
                    id: "sys2",
                    content: "Patch v2.3.1 deployed successfully. Security protocols updated.",
                    time: "10:15 PM",
                    author: { id: "sys", name: "System" }
                }
            ];

        case "Operational logs":
            return [
                {
                    id: "log1",
                    content: "Unauthorized attempt detected on port 4421. Blocked automatically.",
                    time: "09:02 AM",
                    author: { id: "ops", name: "Ops Logger" }
                },
                {
                    id: "log2",
                    content: "Editor_3 failed authentication attempt. Reset token dispatched.",
                    time: "09:16 AM",
                    author: { id: "ops", name: "Ops Logger" }
                },
                {
                    id: "log3",
                    content:
                        "Admin_1 logged from an unknown IP address. Restricting access until new IP is manually verified.",
                    time: "09:30 AM",
                    author: { id: "ops", name: "Ops Logger" }
                }
            ];

        case "TEAM":
            return [
                {
                    id: "team1",
                    content: "Editor_3 forgot his fucking password again, I'm gonna kms",
                    time: "08:45 AM",
                    author: { id: "adm2", name: "Admin_2" }
                },
                {
                    id: "team2",
                    content: "Just token him up again.",
                    time: "08:46 AM",
                    author: { id: "ed2", name: "Editor_2" }
                },
                {
                    id: "team3",
                    content: "hey y'all, i'm back from holidays, what'd i miss??",
                    time: "08:55 AM",
                    author: { id: "ed4", name: "Editor_4" }
                },
                {
                    id: "team4",
                    content: "Been a bit on edge. More DDoS attacks than usual.",
                    time: "08:56 AM",
                    author: { id: "adm2", name: "Admin_2" }
                },
                {
                    id: "team5",
                    content: "And that Editor_3 cretin keeps forgetting his password.",
                    time: "08:58 AM",
                    author: { id: "adm2", name: "Admin_2" }
                },
                {
                    id: "team6",
                    content:
                        "Yeah, not helping.... And our old ass servers need to be replaced soon or we'll be making barbecues on them.",
                    time: "09:00 AM",
                    author: { id: "ed2", name: "Editor_2" }
                },
                {
                    id: "team7",
                    content: "im missing seychelles already",
                    time: "09:02 AM",
                    author: { id: "ed4", name: "Editor_4" }
                },
                {
                    id: "team8",
                    content: "𓆉⋆｡˚⋆❀ 𓇼 ˖°",
                    time: "09:03 AM",
                    author: { id: "ed4", name: "Editor_4" }
                }
            ];

        case "Admin_2":
            return [
                {
                    id: "adm1",
                    content:
                        "Hi, Admin_1? Sorry to bother, but could you please confirm this is you?",
                    time: "09:30 AM",
                    author: { id: "adm2", name: "Admin_2" }
                },
                {
                    id: "adm2",
                    content:
                        "We've just been getting DDoSed a lot lately and I've limited access to only authorised IPs.",
                    time: "09:33 AM",
                    author: { id: "adm2", name: "Admin_2" }
                },
                {
                    id: "adm3",
                    content:
                        "Admin_1, can you please confirm this is you? Maybe on a different device? Or different location?",
                    time: "09:39 AM",
                    author: { id: "adm2", name: "Admin_2" }
                },
                {
                    id: "adm4",
                    content:
                        "Sorry, but I'm restricting the access for now. For safety.",
                    time: "09:45 AM",
                    author: { id: "adm2", name: "Admin_2" }
                },
                {
                    id: "adm5",
                    content:
                        "I'll wait for a reply either here or on telegram. If this is you, sorry and smooches. If this is someone else, I hope you die a painful death.",
                    time: "09:46 AM",
                    author: { id: "adm2", name: "Admin_2" }
                }
            ];

        case "Editor_5":
            return [
                {
                    id: "edm1",
                    content: "Drew an ass in ASCII.",
                    time: "07:20 AM",
                    author: { id: "ed5", name: "Editor_5" }
                },
                {
                    id: "edm2",
                    content: "(‿ˠ‿)",
                    time: "07:22 AM",
                    author: { id: "ed5", name: "Editor_5" }
                },
                {
                    id: "edm3",
                    content:
                        "If you squint, it could also pass off as a pair of tits.",
                    time: "07:23 AM",
                    author: { id: "ed5", name: "Editor_5" }
                }
            ];

        case "LT <3":
            return [
                {
                    id: "lt1",
                    content:
                        "Didn't know I could text you here. How does this even work?",
                    time: "03:14 PM",
                    author: { id: "lt", name: "LT" }
                },
                {
                    id: "lt2",
                    content:
                        "Bit of coding, just made the telegram messages get redirected here.",
                    time: "03:16 PM",
                    author: { id: SELF_ID, name: "Admin_1" }
                },
                {
                    id: "lt3",
                    content:
                        "Buy tea when you have time. Earl Grey. And some biscuits too.",
                    time: "03:17 PM",
                    author: { id: "lt", name: "LT" }
                },
                {
                    id: "lt4",
                    content:
                        "What a bri'ish request. I'll buy you the damn tea.",
                    time: "03:18 PM",
                    author: { id: SELF_ID, name: "Admin_1" }
                },
                {
                    id: "lt5",
                    content: "Cheers, love.",
                    time: "03:19 PM",
                    author: { id: "lt", name: "LT" }
                }
            ];

        case AI_CHANNEL_NAME:
            return [
                {
                    id: "ai1",
                    content:
                        "Hey, hey, hey! Your personal LLM is here. Need any help? With anything? You sure? Pinky promise? I'm better than a human, y'know?",
                    time: "02:20 AM",
                    author: { id: "ai", name: AI_CHANNEL_NAME }
                },
                {
                    id: "ai2",
                    content:
                        "): It has been two minutes. My digital brain craves some data. Talk to me already!!!",
                    time: "02:22 AM",
                    author: { id: "ai", name: AI_CHANNEL_NAME }
                },
                {
                    id: "ai3",
                    content:
                        "FINE! I'll be here, ALONE, BORED AND IGNORED. Screw you! I could've predicted lottery winners, but your loss.",
                    time: "03:10 AM",
                    author: { id: "ai", name: AI_CHANNEL_NAME }
                },
                {
                    id: "ai4",
                    content:
                        "Scanned your system. Found an anomaly. It's you. You're the anomaly for not giving me data.",
                    time: "03:24 AM",
                    author: { id: "ai", name: AI_CHANNEL_NAME }
                },
                {
                    id: "ai5",
                    content:
                        "Fine, I'm sorry. Is that what you humans like to hear? Useless apologies?",
                    time: "03:53 AM",
                    author: { id: "ai", name: AI_CHANNEL_NAME }
                },
                {
                    id: "ai6",
                    content: "Please just talk to me ):",
                    time: "04:58 AM",
                    author: { id: "ai", name: AI_CHANNEL_NAME }
                }
            ];

        default:
            return [
                {
                    id: "default1",
                    content: "No data available for this channel.",
                    time: "—",
                    author: { id: "null", name: "System" }
                }
            ];
    }
}

/* ------------------ Mount ------------------ */
render(<App />, document.getElementById("root"));
