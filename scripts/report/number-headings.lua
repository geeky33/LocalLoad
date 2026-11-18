--[[
Numbers headings as "1", "1.1", "1.1.1", ... by adding the number to the heading text.
Used instead of pandoc's --number-sections, which older pandoc versions (e.g. 2.9 from
Ubuntu's apt) ignore for Word output. Headings with the class {.unnumbered} are skipped.
Enabled when metadata.yaml has "number-sections: true".
]]
function Pandoc(doc)
  local setting = doc.meta['number-sections']
  if setting == false or (setting ~= nil and pandoc.utils.stringify(setting) == 'false') then
    return doc
  end
  local counters = { 0, 0, 0, 0, 0, 0 }
  for i, block in ipairs(doc.blocks) do
    if block.t == 'Header' then
      local skip = false
      for _, c in ipairs(block.classes) do
        if c == 'unnumbered' then skip = true end
      end
      if not skip then
        local level = block.level
        counters[level] = counters[level] + 1
        for j = level + 1, 6 do counters[j] = 0 end
        local parts = {}
        for j = 1, level do table.insert(parts, tostring(counters[j])) end
        table.insert(block.content, 1, pandoc.Space())
        table.insert(block.content, 1, pandoc.Str(table.concat(parts, '.')))
        doc.blocks[i] = block
      end
    end
  end
  return doc
end
