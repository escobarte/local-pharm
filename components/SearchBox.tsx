import { IconSearch } from "./icons";
import { inputClass } from "./ui";

type Props = {
  defaultValue?: string;
  /** Hidden params kept when the form is submitted (category, filter). */
  hidden?: Record<string, string>;
  autoFocus?: boolean;
};

/** Plain GET form → /search: works without JavaScript, the URL is the state. */
export function SearchBox({ defaultValue = "", hidden = {}, autoFocus }: Props) {
  return (
    <form action="/search" method="get" role="search" className="flex gap-2">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input
        type="search"
        name="q"
        aria-label="Поиск по названию, веществу, категории, показаниям"
        placeholder="Название, вещество, симптом"
        defaultValue={defaultValue}
        maxLength={100}
        autoComplete="off"
        autoFocus={autoFocus}
        enterKeyHint="search"
        className={inputClass}
      />
      <button
        type="submit"
        aria-label="Найти"
        className="flex size-12 flex-none items-center justify-center rounded-field bg-navy text-white hover:bg-navy/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        <IconSearch size={22} />
      </button>
    </form>
  );
}
