// test
/* test 2 */
targetScope = 'resourceGroup'

resource avcsdd 'sdf' = {
  abc: 'def'
  'ada': true
}
resource secrets 'Microsoft.KeyVault/vaults/secrets@2018-02-14' = {
  abc: 'def'
}

resource secrets 'Microsoft.KeyVault/vaults/secrets@2018-02-14' = [for secret in secretsObject.secrets: {}]

resource secrets 'Microsoft.KeyVault/vaults/secrets@2018-02-14' = [for secret in secretsObject.secrets: {
  abc: true
  def: {
    ghi: 'jk${true}asdf${23}.\${SDF${FAA}'
    lmn: 'opq'
  }
}]

var multi = ''''''
var multi2 = '''
      hello!
'''

var func = resourceGroup().location
var func2 = reference('Microsoft.KeyVault/vaults/secrets', func)
var func3 = union({
  'abc': resourceGroup().id
}, {
  'def': 'test'
})

@allowed([
  'adf'
  'asdgd'
])
@secure()
var test = true
