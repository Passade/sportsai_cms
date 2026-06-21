import CmsImageUpload from "@/components/cms-image-upload";

// Event thumbnail:
<CmsImageUpload
  label="Upload Event Thumbnail"
  value={form.thumbnail}
  onUploaded={(url) => updateField("thumbnail", url)}
/>

// Team logo:
<CmsImageUpload
  label="Upload Team Logo"
  value={form.logoUrl}
  onUploaded={(url) => updateField("logoUrl", url)}
/>

// Player photo:
<CmsImageUpload
  label="Upload Player Photo"
  value={form.imageUrl}
  onUploaded={(url) => updateField("imageUrl", url)}
/>

// Community post image:
<CmsImageUpload
  label="Upload Post Image"
  value={form.postImageUrl}
  onUploaded={(url) => updateField("postImageUrl", url)}
/>

// Community option image:
<CmsImageUpload
  label="Upload Option Image"
  value={option.imageUrl}
  onUploaded={(url) => updateOption(index, "imageUrl", url)}
/>
