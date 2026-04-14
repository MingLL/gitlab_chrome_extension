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
  selectLabel: string;
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
  selectLabel,
  clearSelectionLabel,
  onQueryChange,
  onSelect
}: SearchListProps) {
  const selectedItem = items.find((item) => item.value === value) ?? null;

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

      {items.length === 0 ? (
        <p className="search-list__empty">{emptyMessage}</p>
      ) : (
        <div className="field">
          <label htmlFor={`${label}-select`}>{selectLabel}</label>
          <select
            id={`${label}-select`}
            value={value}
            disabled={disabled}
            onChange={(event) => onSelect(event.target.value)}
          >
            {items.map((item) => (
              <option key={item.value} value={item.value}>
                {item.badge ? `${item.title} (${item.badge})` : item.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {clearSelectionLabel && value !== '' ? (
        <button className="button button--secondary" disabled={disabled} type="button" onClick={() => onSelect('')}>
          {clearSelectionLabel}
        </button>
      ) : null}

      {selectedItem ? (
        <div className="search-list__details">
          <span className="search-list__main">
            <span className="search-list__title">{selectedItem.title}</span>
            {selectedItem.badge ? <span className="search-list__badge">{selectedItem.badge}</span> : null}
          </span>
          {selectedItem.description ? <span className="search-list__description">{selectedItem.description}</span> : null}
          {selectedItem.meta ? <span className="search-list__meta">{selectedItem.meta}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export type { SearchListItem };
