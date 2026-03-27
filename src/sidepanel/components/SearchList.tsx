type SearchListItem = {
  value: string;
  title: string;
  description?: string;
  meta?: string;
  badge?: string;
};

type SearchListProps = {
  label: string;
  placeholder: string;
  items: SearchListItem[];
  value: string;
  query: string;
  disabled: boolean;
  emptyMessage: string;
  clearSelectionLabel?: string;
  onQueryChange: (query: string) => void;
  onSelect: (value: string) => void;
};

export function SearchList({
  label,
  placeholder,
  items,
  value,
  query,
  disabled,
  emptyMessage,
  clearSelectionLabel,
  onQueryChange,
  onSelect
}: SearchListProps) {
  return (
    <div className="search-list">
      <div className="field">
        <label htmlFor={`${label}-search`}>{label}</label>
        <input
          id={`${label}-search`}
          type="text"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      {clearSelectionLabel && value !== '' ? (
        <button className="button button--secondary" disabled={disabled} type="button" onClick={() => onSelect('')}>
          {clearSelectionLabel}
        </button>
      ) : null}

      <div className="search-list__results" role="list">
        {items.length === 0 ? (
          <p className="search-list__empty">{emptyMessage}</p>
        ) : (
          items.map((item) => (
            <button
              key={item.value}
              className={`search-list__item${item.value === value ? ' search-list__item--selected' : ''}`}
              disabled={disabled}
              type="button"
              onClick={() => onSelect(item.value)}
            >
              <span className="search-list__main">
                <span className="search-list__title">{item.title}</span>
                {item.badge ? <span className="search-list__badge">{item.badge}</span> : null}
              </span>
              {item.description ? <span className="search-list__description">{item.description}</span> : null}
              {item.meta ? <span className="search-list__meta">{item.meta}</span> : null}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export type { SearchListItem };
