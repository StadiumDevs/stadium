/** The " *" after a required field's label (the form says what * means). */
export function RequiredMark({ show = true }: { show?: boolean }) {
  return show ? <span aria-hidden="true"> *</span> : null;
}
