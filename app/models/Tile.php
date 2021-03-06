<?php
namespace app\models;

use app\inc\Model;

class Tile extends Model {
	var $table;
	function __construct($table) {
		parent::__construct();
		$this->table = $table;
	}
	public function get() {
		$sql = "SELECT def FROM settings.geometry_columns_join WHERE _key_='{$this->table}'";
		$row = $this->fetchRow($this->execQuery($sql),"assoc");
		if (!$this->PDOerror) {
			$response['success'] = true;
			$arr = (array)json_decode($row['def']); // Cast stdclass to array
			/*$props = array("label_column"=>"","theme_column"=>"","meta_tiles"=>false);
			foreach($props as $field=>$value){
				if (!isset($arr[$field])){
					$arr[$field] = $value;
				}
			}*/
			$response['data'] = array($arr);
		}
		else {
			$response['success'] = false;
			$response['message'] = $this->PDOerror[0];
		}
		return $response;
	}
	public function update($data) {
		$sql = "UPDATE settings.geometry_columns_join SET def='{$data}' WHERE _key_='{$this->table}'";
		$this->execQuery($sql,"PDO","transaction");
		
		if (!$this->PDOerror) {
			$response['success'] = true;
			$response['message'] = "Def updated";
		}
		else {
			$response['success'] = false;
			$response['message'] = $this->PDOerror[0];
		}
		return $response;
	}
}