"use client";
import { forwardRef, useLayoutEffect, useRef, useImperativeHandle } from "react";

/**
 * <textarea> que se ajusta automáticamente al contenido.
 * Sin scrollbar interno — todas las líneas se ven.
 */
export interface AutoResizeTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> {
  minRows?: number;
}

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  function AutoResizeTextarea({ minRows = 1, style, value, onInput, ...props }, ref) {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const resize = () => {
      const ta = innerRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    };

    // Recalcula cuando cambia el value (controlado) o al montar
    useLayoutEffect(() => {
      resize();
    }, [value]);

    return (
      <textarea
        ref={innerRef}
        value={value}
        rows={minRows}
        onInput={(e) => {
          resize();
          onInput?.(e);
        }}
        style={{
          overflow: "hidden",
          resize: "none",
          ...style,
        }}
        {...props}
      />
    );
  }
);
