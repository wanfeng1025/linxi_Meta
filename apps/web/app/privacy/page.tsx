export default function PrivacyPage() {
  return (
    <section className="card">
      <h1>隐私说明</h1>
      <p>
        本版本不要求登录，也不向服务端上传问题、铜钱或结果。起卦草稿和锁定结果仅保存在当前浏览器会话的
        sessionStorage 中。
      </p>
      <p>它不会跨设备同步；关闭会话、使用隐私模式或清除浏览器网站数据后，记录可能无法恢复。</p>
    </section>
  );
}
