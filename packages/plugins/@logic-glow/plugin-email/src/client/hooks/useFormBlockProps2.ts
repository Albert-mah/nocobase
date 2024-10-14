/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import {
  useAPITokenVariable,
  useCurrentPopupRecord,
  useCurrentUserContext,
  useFormBlockContext,
  useRequest,
} from '@nocobase/client';
import { useFieldSchema } from '@formily/react';
import { Form } from '@formily/core';
import { useEffect, useMemo } from 'react';

function renderStrings(rawString: string, value: any) {
  if (!rawString) {
    return '';
  }

  return rawString.replace(/{{\s*([^}]+)\s*}}/g, (match, key) => {
    const keys = key.trim().split('.');
    let result = value;

    for (let i = 0; i < keys.length; i++) {
      if (result && Object.prototype.hasOwnProperty.call(result, keys[i])) {
        result = result[keys[i]];
      } else {
        return match; // 返回原始占位符
      }
    }

    return result !== undefined ? result : match;
  });
}

export const useFormBlockProps2 = () => {
  const { collection, value } = useCurrentPopupRecord();
  const ctx = useFormBlockContext();
  let schemaThis = useFieldSchema();

  while (schemaThis && schemaThis['x-action'] !== 'customize:emailSend') {
    schemaThis = schemaThis.parent;
  }

  const url = `emailTemplateConfigs:get/${schemaThis?.['x-uid']}`;

  // 优化请求使用 useRequest
  const { data } = useRequest<{ data: { options: any; title: string; roles: any[] } }>({
    url,
    params: {},
  });

  const userContext = useCurrentUserContext();
  const { apiTokenCtx } = useAPITokenVariable();

  // 用 useMemo 处理 valueMap 的计算，避免重复计算
  const valueMap = useMemo(
    () => ({
      currentRecord: { ...value },
      currentUser: userContext?.data?.data,
      currentTime: new Date(),
      $nToken: apiTokenCtx,
    }),
    [value, userContext?.data?.data, apiTokenCtx],
  );
  console.log(collection);
  console.log(value);

  const attachmentValues = useMemo(() => {
    let values: any[] = []; // 初始化为空数组
    if (data?.data?.options?.attachments_auto_import) {
      // 从 collection 中找到 interface 为 "attachment" 的所有列
      const attachmentFields = collection.fields.filter((field) => field.interface === 'attachment');
      // 遍历所有 attachment 字段，获取 value 中对应的值
      attachmentFields.forEach((field) => {
        const fieldName = field.name; // 获取字段名
        if (value[fieldName]) {
          values = values.concat(value[fieldName]); // 合并数组
        }
      });
    }
    return values; // 返回合并后的结果
  }, [collection.fields, value, data?.data?.options?.attachments_auto_import]);

  // console.log(attachmentValues);
  // 使用 useMemo 缓存解析的字符串值
  const subjVal = useMemo(() => renderStrings(data?.data?.options?.subject, valueMap), [data, valueMap]);
  const bodyVal = useMemo(() => renderStrings(data?.data?.options?.body, valueMap), [data, valueMap]);

  const form: Form = ctx.form;

  // 使用 useEffect 设置初始值，只在表单和请求数据变化时重新执行
  useEffect(() => {
    if (!form || ctx.service?.loading) {
      return;
    }

    const initialValues = {
      subject: subjVal,
      body: bodyVal,
      attachment: attachmentValues,
    };

    form.setInitialValues(initialValues);
  }, [form, subjVal, bodyVal, ctx.service?.loading, attachmentValues]);

  return {
    form: ctx.form,
  };
};
