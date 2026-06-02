import React from 'react';

interface ToolbarProps {
  onNewCard: () => void;
  onSave: () => void;
  onExport: () => void;
  onBatchExport: () => void;
  isDirty: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onNewCard,
  onSave,
  onExport,
  onBatchExport,
  isDirty,
}) => {
  return (
    <div className="toolbar">
      <button className="toolbar__btn toolbar__btn--new" onClick={onNewCard} title="创建新卡牌">
        新建
      </button>
      <button
        className="toolbar__btn toolbar__btn--save"
        onClick={onSave}
        disabled={!isDirty}
        title={isDirty ? '保存当前卡牌' : '无更改可保存'}
      >
        保存{isDirty ? ' ●' : ''}
      </button>
      <button className="toolbar__btn toolbar__btn--export" onClick={onExport} title="导出当前卡牌">
        导出
      </button>
      <button className="toolbar__btn toolbar__btn--batch" onClick={onBatchExport} title="批量导出卡牌">
        批量导出
      </button>
    </div>
  );
};
