import type { CSSProperties, HTMLAttributes } from "react";
import React, { forwardRef } from "react";

import "./Action.css";

/**
 * Properties expected by the Action component.
 */
export interface ActionProps extends HTMLAttributes<HTMLButtonElement> {
  /**
   * Styles override for when the button/action is pressed
   * (fill is used for the color of the svg icon).
   */
  active?: {
    fill: string;
    background: string;
  };

  /**
   * The shape of the mouse pointer.
   */
  cursor?: CSSProperties["cursor"];
}

/**
 * A button with customizable pressed apparence.
 *
 * This is the base for other buttons in the application.
 *
 * Style accepts `--action-background` as variable for
 * hover background color customization.
 *
 */
export const Action = forwardRef<HTMLButtonElement, ActionProps>(
  ({ active, className, cursor, style, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className={`Action ${className}`}
      tabIndex={0}
      style={
        {
          ...style,
          cursor,
          "--fill": active?.fill,
          "--background": active?.background,
        } as CSSProperties
      }
    />
  )
);
