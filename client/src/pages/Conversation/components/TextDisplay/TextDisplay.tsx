import { FC, useEffect, useRef } from "react";
import { useServerText } from "../../hooks/useServerText";

type TextDisplayProps = {
  containerRef: React.RefObject<HTMLDivElement>;
  userText: string[];
};

export const TextDisplay:FC<TextDisplayProps> = ({
  containerRef,
  userText,
}) => {
  const { text } = useServerText();
  const currentIndex = text.length - 1;
  const prevScrollTop = useRef(0);

  useEffect(() => {
    if (containerRef.current) {
      prevScrollTop.current = containerRef.current.scrollTop;
      containerRef.current.scroll({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [text]);

  return (
    <div className="h-full w-full max-w-full max-h-full  p-2">
      <div className="pb-3">
        <div className="text-xs text-zinc-500">User</div>
        <div className="text-sm text-zinc-700 whitespace-pre-wrap">
          {userText.length > 0 ? userText.join("\n") : "Waiting for speech transcript..."}
        </div>
      </div>
      <div>
        <div className="text-xs text-zinc-500">Assistant</div>
        <div className="text-sm whitespace-pre-wrap">
          {text.map((t, i) => (
            <span
              key={i}
              className={`${i === currentIndex ? "font-bold" : "font-normal"}`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
