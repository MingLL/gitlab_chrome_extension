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
        selectLabel="仓库结果"
        onQueryChange={vi.fn()}
        onSelect={onSelect}
      />
    );

    await user.selectOptions(screen.getByLabelText('仓库结果'), '1');

    expect(onSelect).toHaveBeenCalledWith('1');
  });

  test('使用下拉框承载候选结果，避免平铺展示完整列表', () => {
    render(
      <SearchList
        label="仓库搜索"
        placeholder="搜索仓库名称或路径"
        items={[
          { value: '1', title: 'API', description: 'team/api' },
          { value: '2', title: 'Web', description: 'team/web' },
          { value: '3', title: 'Ops', description: 'team/ops' }
        ]}
        value=""
        query=""
        disabled={false}
        emptyMessage="没有匹配的仓库"
        selectLabel="仓库结果"
        onQueryChange={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox', { name: '仓库结果' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /API/ })).not.toBeInTheDocument();
  });

  test('保留当前选中项，即使它不在过滤后的前几项里', () => {
    render(
      <SearchList
        label="分支搜索"
        placeholder="搜索分支名称"
        items={[
          { value: 'release/1.0.0', title: 'release/1.0.0' },
          { value: 'main', title: 'main' }
        ]}
        value="main"
        query=""
        disabled={false}
        emptyMessage="没有匹配的分支"
        selectLabel="分支结果"
        onQueryChange={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByLabelText('分支结果')).toHaveValue('main');
  });

  test('没有候选结果时展示空状态文本', () => {
    render(
      <SearchList
        label="分支搜索"
        placeholder="搜索分支名称"
        items={[]}
        value=""
        query=""
        disabled={false}
        emptyMessage="没有匹配的分支"
        selectLabel="分支结果"
        onQueryChange={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('没有匹配的分支')).toBeInTheDocument();
  });
});
