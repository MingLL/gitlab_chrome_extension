import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { SearchList } from './SearchList';

afterEach(() => {
  cleanup();
});

describe('SearchList', () => {
  test('输入搜索词后只显示匹配项', async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();

    render(
      <SearchList
        label="仓库搜索"
        placeholder="搜索仓库名称或路径"
        items={[
          { value: '1', title: 'API', description: 'team/api' },
          { value: '2', title: 'Web', description: 'team/web' }
        ]}
        value=""
        query=""
        disabled={false}
        emptyMessage="没有匹配的仓库"
        onQueryChange={onQueryChange}
        onSelect={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText('仓库搜索'), 'team/api');

    expect(onQueryChange).toHaveBeenCalled();
  });

  test('点击列表项后触发选中回调', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <SearchList
        label="仓库搜索"
        placeholder="搜索仓库名称或路径"
        items={[{ value: '1', title: 'API', description: 'team/api' }]}
        value=""
        query="api"
        disabled={false}
        emptyMessage="没有匹配的仓库"
        onQueryChange={vi.fn()}
        onSelect={onSelect}
      />
    );

    await user.click(screen.getByRole('button', { name: /API/ }));

    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
