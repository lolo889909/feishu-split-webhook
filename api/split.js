import axios from "axios";

export default async function handler(req, res) {
  const { record_id, field_name = "图片附件" } = req.body;
  const app_token = process.env.APP_TOKEN;
  const table_id = process.env.TABLE_ID;

  try {
    // 获取飞书 tenant_access_token
    const tokenResp = await axios.post(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        app_id: process.env.APP_ID,
        app_secret: process.env.APP_SECRET,
      }
    );
    const taToken = tokenResp.data.tenant_access_token;

    // 获取原始记录
    const baseUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}`;
    const recordResp = await axios.get(`${baseUrl}/records/${record_id}`, {
      headers: { Authorization: `Bearer ${taToken}` },
    });
    const record = recordResp.data.data;
    const fields = record.fields;
    const imgs = fields[field_name] || [];

    if (imgs.length <= 1) {
      return res.json({ message: "只有一张图，无需拆分" });
    }

    // 拆分多图记录
    const baseFields = {};
    for (const k in fields) if (k !== field_name) baseFields[k] = fields[k];

    for (const img of imgs) {
      await axios.post(
        `${baseUrl}/records`,
        { fields: { ...baseFields, [field_name]: [img] } },
        { headers: { Authorization: `Bearer ${taToken}` } }
      );
    }

    res.json({ message: `已拆分 ${imgs.length} 张图片` });
  } catch (error) {
    console.error("错误：", error.response?.data || error.message);
    res.status(500).json({ error: "执行失败", detail: error.message });
  }
}
